const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const FormData = require('form-data');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const axios = require('axios');
const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

// ── Email (Namecheap Private Email / SMTP) ─────────────────────────────────
let emailTransporter = null;
function initEmail() {
  const host = process.env.EMAIL_HOST || 'mail.privateemail.com';
  const user = process.env.EMAIL_USER || '';
  const pass = process.env.EMAIL_PASSWORD || '';
  if (!user || !pass) { console.warn('[Email] EMAIL_USER or EMAIL_PASSWORD not set — emails disabled'); return; }
  emailTransporter = nodemailer.createTransport({
    host, port: 587, secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: true }
  });
  emailTransporter.verify(err => {
    if (err) { console.warn('[Email] SMTP verify failed:', err.message); emailTransporter = null; }
    else console.log('[Email] SMTP ready —', user);
  });
}

async function sendEmail({ to, subject, html, text }) {
  if (!emailTransporter) return;
  try {
    await emailTransporter.sendMail({
      from: `"SAAD STUDIO" <${process.env.EMAIL_USER}>`,
      to, subject, html, text
    });
  } catch (e) { console.error('[Email] send error:', e.message); }
}
// ────────────────────────────────────────────────────────────────────────────

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

loadEnvFile();
initEmail();

// ─── REQUIRED ENV VARS (crash fast if missing in production) ──────────────────
const IS_PROD = process.env.NODE_ENV === 'production';
const REQUIRED_ENV = ['KIE_API_KEY', 'ADMIN_PASSWORD', 'ADMIN_USERNAME'];
if (IS_PROD) REQUIRED_ENV.push('ALLOWED_ORIGIN');
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    if (IS_PROD) {
      console.error(`[FATAL] Missing required environment variable: ${key}`);
      process.exit(1);
    } else {
      console.warn(`[WARN] Missing env var: ${key} — set this before deploying`);
    }
  }
}
if (IS_PROD && (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12)) {
  console.error('[FATAL] ADMIN_PASSWORD must be at least 12 characters in production');
  process.exit(1);
}
if (IS_PROD && process.env.ADMIN_PASSWORD && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(process.env.ADMIN_PASSWORD)) {
  console.error('[FATAL] ADMIN_PASSWORD must contain uppercase, lowercase and a digit');
  process.exit(1);
}
if (IS_PROD && !process.env.GOOGLE_CLIENT_ID) {
  console.warn('[WARN] GOOGLE_CLIENT_ID not set — Google login aud will not be verified');
}

const app = express();

// Trust reverse proxy (nginx/Caddy) so rate limiters see real IPs
if (IS_PROD) app.set('trust proxy', 1);

const PORT = process.env.PORT || 6188;
const COMFY_URL = 'http://127.0.0.1:8188';
const COMFY_ENABLED = String(process.env.COMFY_ENABLED || '').toLowerCase() === 'true';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const KIE_API_KEY = process.env.KIE_API_KEY || '';
const KIE_API_BASE_URL = 'https://api.kie.ai/api/v1';
const KIE_GPT52_BASE_URL = 'https://api.kie.ai';
const KIE_CODEX_BASE_URL = 'https://api.kie.ai/codex/v1';
const KIE_UPLOAD_BASE_URL = 'https://kieai.redpandaai.co';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// ─── SUPABASE CLIENTS ─────────────────────────────────────────────────────────
// supabase  — anon key, used for auth sign-in / sign-up (safe for user-facing ops)
// supabaseAdmin — service role key, used for profiles table + admin auth operations
const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;
const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const KIE_GPT_FALLBACKS = (process.env.KIE_GPT_FALLBACKS || 'gpt-5-2,gpt-5-4,gpt-4.1,gpt-4o-mini')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// ─── PROFIT MARGIN ────────────────────────────────────────────────────────────
// هامش الربح — افتراضي 40% ، يمكن تغييره عبر .env: PROFIT_MARGIN=0.30
const PROFIT_MARGIN = Math.max(0, Number(process.env.PROFIT_MARGIN ?? 0.40));

const WORKFLOWS_DIR = path.join(__dirname, 'workflows');
const UPLOADS_DIR   = path.join(__dirname, 'uploads');
[WORKFLOWS_DIR, UPLOADS_DIR].forEach(d => !fs.existsSync(d) && fs.mkdirSync(d, {recursive:true}));

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(.+?);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');
  return { mimeType: match[1], data: match[2] };
}

async function kieFetch(endpoint, options = {}) {
  if (!KIE_API_KEY) {
    throw new Error('Missing KIE_API_KEY in environment');
  }

  const headers = {
    Authorization: `Bearer ${KIE_API_KEY}`,
    ...(options.headers || {})
  };

  const response = await fetch(`${KIE_API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.msg ||
      data?.error?.message ||
      data?.error ||
      'Kie API request failed';
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

async function kieFetchFirst(endpoints, options = {}) {
  let lastError;
  for (const endpoint of endpoints) {
    try {
      return await kieFetch(endpoint, options);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Kie request failed');
}

async function kieGpt52Fetch(payload) {
  if (!KIE_API_KEY) {
    throw new Error('Missing KIE_API_KEY in environment');
  }

  const response = await fetch(`${KIE_GPT52_BASE_URL}/gpt-5-2/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.msg ||
      data?.message ||
      data?.error ||
      'Kie GPT-5-2 request failed';
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

async function kieCodexFetch(payload) {
  if (!KIE_API_KEY) {
    throw new Error('Missing KIE_API_KEY in environment');
  }

  const response = await fetch(`${KIE_CODEX_BASE_URL}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.msg ||
      data?.message ||
      data?.error ||
      'Kie Codex request failed';
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function pcmToWavBase64(pcmBase64, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const pcmBuffer = Buffer.from(String(pcmBase64 || ''), 'base64');
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const wavBuffer = Buffer.alloc(44 + pcmBuffer.length);

  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(36 + pcmBuffer.length, 4);
  wavBuffer.write('WAVE', 8);
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20);
  wavBuffer.writeUInt16LE(channels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(bitsPerSample, 34);
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(pcmBuffer.length, 40);
  pcmBuffer.copy(wavBuffer, 44);

  return wavBuffer.toString('base64');
}

// â”€â”€â”€ Rate limiters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير من المحاولات، يُرجى الانتظار 15 دقيقة' }
});
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير من المحاولات' }
});
const generationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جداً، حاول لاحقاً' }
});
const cmsWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جداً' }
});
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جداً' }
});
const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات كثيرة لتغيير كلمة المرور' }
});

// ─── SECURITY HEADERS (helmet) ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: ["'self'", "https://accounts.google.com", "https://oauth2.googleapis.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      mediaSrc: ["'self'", "blob:", "data:", "https:"],
      workerSrc: ["'self'", "blob:"],
      scriptSrcAttr: ["'unsafe-inline'"],
      upgradeInsecureRequests: IS_PROD ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false, // Required for Google Sign-In popup flow
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: IS_PROD ? { maxAge: 31536000, includeSubDomains: true } : false,
  permissionsPolicy: {
    features: {
      camera: [],
      microphone: [],
      geolocation: []
    }
  }
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  // In production only allow the configured origin; in dev allow all localhost
  const allowed = ALLOWED_ORIGIN
    ? origin === ALLOWED_ORIGIN
    : IS_PROD ? false : /^https?:\/\/localhost(:\d+)?$/.test(origin);
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-csrf-token');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({limit:'50mb'}));

// ─── COOKIE PARSER ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const cookies = {};
  (req.headers.cookie || '').split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > 0) cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  req.cookies = cookies;
  next();
});

// ─── MULTI-PAGE ARCHITECTURE ──────────────────────────────────────────────────
const MULTIPAGE_DIR = path.join(__dirname, 'SAAD_STUDIO_MultiPage');
const { registerMultiPageRoutes } = require(path.join(MULTIPAGE_DIR, 'routes-multipage'));
registerMultiPageRoutes(app);
app.use(express.static(MULTIPAGE_DIR));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Keep the full studio accessible at /app after introducing Explore as homepage.
app.get('/app', (req, res) => {
  res.sendFile(path.join(MULTIPAGE_DIR, 'app.html'));
});

// ─── CMS Frontend Routes ─── serve site.html for all CMS-driven pages
app.get(['/home', '/about', '/contact', '/pricing', '/features', '/blog', '/team', '/faq', '/terms', '/privacy'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'site.html'));
});
app.get('/p/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'site.html'));
});

// attachUser MUST run before requireSignedIn so req.currentUser is populated
// attachUser is async (Supabase verification) — Express 4 handles this via callback-style next()
app.use((req, res, next) => { attachUser(req, res, next); });
app.use('/api/kie', (req, res, next) => requireSignedIn(req, res, next));
app.use('/api/generate', (req, res, next) => requireSignedIn(req, res, next));
app.use('/api/google-video', (req, res, next) => requireSignedIn(req, res, next));
app.use('/api/kie-veo', (req, res, next) => requireSignedIn(req, res, next));
// Apply generation rate limiting to all AI generation routes
app.use('/api/kie', generationLimiter);
app.use('/api/generate', generationLimiter);
app.use('/api/google-video', generationLimiter);
app.use('/api/kie-veo', generationLimiter);
app.use('/api/runway-gen', (req, res, next) => requireSignedIn(req, res, next));
app.use('/api/runway-gen', generationLimiter);
const upload = multer({ dest: UPLOADS_DIR, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

// â•â•â• LITEGRAPH â†’ API CONVERTER â•â•â•
const WIDGET_NAMES = {
  'CheckpointLoaderSimple':['ckpt_name'],
  'UNETLoader':['unet_name','weight_dtype'],
  'CLIPLoader':['clip_name','type','device'],
  'CLIPVisionLoader':['clip_name'],
  'VAELoader':['vae_name'],
  'KSampler':['seed','control_after_generate','steps','cfg','sampler_name','scheduler','denoise'],
  'KSamplerAdvanced':['add_noise','noise_seed','control_after_generate','steps','cfg','sampler_name','scheduler','start_at_step','end_at_step','return_with_leftover_noise'],
  'EmptyLatentImage':['width','height','batch_size'],
  'EmptySD3LatentImage':['width','height','batch_size'],
  'LoadImage':['image','upload'],
  'SaveImage':['filename_prefix'],
  'CLIPTextEncode':['text'],
  'ImageConcanate':['direction','match_image_size'],
  'FluxResolutionNode':['megapixel','aspect_ratio','custom_ratio','custom_aspect_ratio','divisible_by'],
  'Text Multiline':['text'],
  'PrimitiveStringMultiline':['value'],
  'INTConstant':['value'],
  'PrimitiveFloat':['value'],
  'ModelSamplingSD3':['shift'],
  'ModelSamplingAuraFlow':['shift'],
  'CFGNorm':['cfg_norm'],
  'ModelPatchTorchSettings':['enabled'],
  'PathchSageAttentionKJ':['sageattn_mode','dynamic_shift'],
  'wanBlockSwap':['blocks_to_swap','offload_txt_in','offload_img_in','offload_img_out','use_non_blocking'],
  'WanImageToVideo':['width','height','length','batch_size'],
  'VHS_VideoCombine':['frame_rate','loop_count','filename_prefix','format','pix_fmt','crf','save_metadata','trim_to_audio','pingpong','save_output'],
  'LoraLoaderModelOnly':['lora_name','strength_model'],
  'CLIPVisionEncode':['crop'],
  'ImageResizeKJv2':['width','height','upscale_method','keep_proportion','divisor','crop_pad','pad_color','cropping','offset_w','offset_h','sharpening','target_side'],
  'LayerUtility: ImageScaleByAspectRatio V2':['aspect_ratio','proportional_width','proportional_height','fit','method','round_to_multiple','target_side','target_size','background_color'],
  'ImageScaleToTotalPixels':['upscale_method','megapixels','samples'],
  'AutoCropFaces':['facedetection','scale_factor','min_face','shift_face','crop_size','padding_type'],
  'TextEncodeQwenImageEditPlus':['image3','prompt'],
  'TextEncodeQwenImageEditPlusAdv':['positive','negative','enabled','mode'],
  'TextEncodeQwenImageEditPlusAdvance_lrzjason':['text','target_width','target_height','resize_method','crop_position','system_prompt'],
  'GGUFLoaderKJ':['unet_name','dequant_dtype','torch_dtype','enable_teacache','teacache_rel_l1_thresh','load_device'],
  'SeedVR2LoadDiTModel':['model_name','device','steps','enable_vae_tiling','offload_device','attention_mode_dit','attention_mode_vae'],
  'SeedVR2LoadVAEModel':['model_name','device','enable_tiling','tile_size','tile_stride','enable_tiling_decoder','tile_size_decoder','tile_stride_decoder','temporal_tiling','offload_device','enable_vae_slicing'],
  'SeedVR2VideoUpscaler':['seed','control_after_generate','tile_size_w','tile_size_h','steps','temporal_overlap','color_correction','overlap_w','overlap_h','pad_w','pad_h','offload_device','enable_vae_slicing'],
  'SaveLatent':['filename_prefix'],
  'DownloadAndLoadFlorence2Model':['model','precision','attention','convert_to_safetensors'],
  'Florence2Run':['text_input','task','fill_mask','keep_model_loaded','max_new_tokens','num_beams','do_sample','output_mask_select','seed','engine_size'],
  'easy promptLine':['text','index','rows','delimiter'],
  'LayerUtility: PurgeVRAM':['do_purge_mem','do_gc'],
};

const SKIP_TYPES = new Set(['Note','MarkdownNote','PrimitiveNode','PreviewImage','ShowText|pysssss']);

function litegraphToAPI(wf) {
  if (!wf.nodes) return wf;
  const links = {};
  for (const l of (wf.links||[])) links[l[0]] = {from_node:String(l[1]),from_slot:l[2]};
  const api = {};
  for (const n of wf.nodes) {
    const t = n.type||'';
    if (SKIP_TYPES.has(t)) continue;
    const inp = {};
    const wv = [...(n.widgets_values||[])];
    let wi = 0;
    for (const input of (n.inputs||[])) {
      const lnk = input.link;
      if (lnk!=null && links[lnk]) inp[input.name]=[links[lnk].from_node,links[lnk].from_slot];
    }
    for (const wname of (WIDGET_NAMES[t]||[])) {
      if (!(wname in inp) && wi<wv.length) inp[wname]=wv[wi++];
    }
    api[String(n.id)]={class_type:t,inputs:inp};
  }
  return api;
}

// â•â•â• UPLOAD IMAGE â•â•â•
app.post('/api/upload', requireSignedIn, uploadLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    if (!isAllowedUpload(req.file, ALLOWED_IMAGE_MIMES)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      auditLog('upload.rejected', 'name="' + (req.file.originalname||'').slice(0,80) + '" mime="' + req.file.mimetype + '"', req);
      return res.status(400).json({ error: 'نوع الملف غير مسموح' });
    }
    const buf = fs.readFileSync(req.file.path);
    const form = new FormData();
    form.append('image', buf, {filename:req.file.originalname||'upload.png',contentType:req.file.mimetype});
    form.append('overwrite','true');
    const r = await fetch(`${COMFY_URL}/upload/image`,{method:'POST',body:form,headers:form.getHeaders()});
    const data = await r.json();
    fs.unlinkSync(req.file.path);
    auditLog('upload.success', 'comfy name="' + (req.file.originalname||'').slice(0,80) + '" user="' + (req.currentUser?.email||'unknown') + '"', req);
    res.json(data);
  } catch(e) { res.status(500).json({ error: "حدث خطأ في الخادم" }); }
});

app.post('/api/store-image', requireSignedIn, async (req, res) => {
  try {
    const { dataUrl = '' } = req.body || {};
    if (!dataUrl || !String(dataUrl).startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image data' });
    }
    const match = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/);
    if (!match) return res.status(400).json({ error: 'Invalid data URL' });
    const mime = match[1];
    // Reject SVG to prevent stored XSS
    if (mime === 'image/svg+xml') return res.status(400).json({ error: 'SVG not allowed' });
    const base64 = match[2];
    const ext = mime.split('/')[1].replace('jpeg', 'jpg').replace(/[^a-z0-9]/gi, '');
    const dir = path.join(UPLOADS_DIR, 'gallery');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // prefix is NOT taken from user input — use fixed safe prefix
    const name = `img-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const filePath = path.join(dir, name);
    // Verify path stays within gallery dir (path traversal protection)
    if (!path.resolve(filePath).startsWith(path.resolve(dir) + path.sep)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    const savedUrl = `/uploads/gallery/${name}`;
    if (req.currentUser?.id) attachActivityImage(req.currentUser.id, savedUrl);
    res.json({ url: savedUrl });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/store-image-url', requireSignedIn, async (req, res) => {
  try {
    const { url = '' } = req.body || {};
    const remoteUrl = String(url || '').trim();
    if (!remoteUrl) return res.status(400).json({ error: 'url required' });

    let parsed;
    try { parsed = new URL(remoteUrl); } catch (_) { return res.status(400).json({ error: 'Invalid URL' }); }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }

    const host = String(parsed.hostname || '').toLowerCase();
    const isPrivateHost =
      host === 'localhost' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host === '127.0.0.1' ||
      host.endsWith('.local') ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
    if (isPrivateHost) return res.status(400).json({ error: 'Blocked host' });

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15000);
    let rr;
    try {
      rr = await fetch(remoteUrl, { signal: ctrl.signal, redirect: 'follow' });
    } finally {
      clearTimeout(timeout);
    }
    if (!rr || !rr.ok) {
      return res.status(400).json({ error: 'Failed to fetch image' });
    }

    const ctype = String(rr.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!ctype.startsWith('image/')) return res.status(400).json({ error: 'URL is not an image' });
    if (ctype === 'image/svg+xml') return res.status(400).json({ error: 'SVG not allowed' });

    const raw = Buffer.from(await rr.arrayBuffer());
    if (!raw.length) return res.status(400).json({ error: 'Empty image' });
    if (raw.length > 12 * 1024 * 1024) return res.status(413).json({ error: 'Image too large' });

    const ext = ctype.split('/')[1].replace('jpeg', 'jpg').replace(/[^a-z0-9]/gi, '') || 'png';
    const dir = path.join(UPLOADS_DIR, 'gallery');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const name = `img-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const filePath = path.join(dir, name);
    if (!path.resolve(filePath).startsWith(path.resolve(dir) + path.sep)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    fs.writeFileSync(filePath, raw);
    const savedUrl = `/uploads/gallery/${name}`;
    if (req.currentUser?.id) attachActivityImage(req.currentUser.id, savedUrl);
    res.json({ url: savedUrl });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// â•â•â• RUN WORKFLOW FROM FILE â•â•â•
// --- LOG GENERATION (called by client after result is ready) ---
app.post('/api/log-generation', requireSignedIn, (req, res) => {
  try {
    const { url, isVideo, model, prompt } = req.body || {};
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' });
    // Look up credits from the most recent activity log entry for this user+model (within 10 min)
    let credits = 0;
    try {
      const actLog = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf8'));
      const cutoff = Date.now() - 10 * 60 * 1000;
      const match = actLog.find(e =>
        e.userId === String(req.currentUser.id) &&
        e.model === String(model || '') &&
        new Date(e.createdAt).getTime() > cutoff
      );
      if (match) credits = match.credits || 0;
    } catch (_) {}
    logGeneration(
      req.currentUser.id,
      req.currentUser.email,
      url,
      !!isVideo,
      String(model || '').slice(0, 100),
      String(prompt || '').slice(0, 200),
      credits
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server error' });
  }
});
app.post('/api/run', requireSignedIn, async (req, res) => {
  try {
    const {workflow_file, inject} = req.body;
    const wfPath = path.join(WORKFLOWS_DIR, path.basename(String(workflow_file || '')));
    if (!wfPath.startsWith(WORKFLOWS_DIR + path.sep) && wfPath !== WORKFLOWS_DIR) {
      return res.status(400).json({error:'Invalid workflow file'});
    }
    if (!fs.existsSync(wfPath)) return res.status(404).json({error:'workflow not found: '+workflow_file});
    const raw = JSON.parse(fs.readFileSync(wfPath,'utf8'));
    const api = litegraphToAPI(raw);
    if (inject) {
      for (const [nodeId,params] of Object.entries(inject)) {
        if (api[nodeId]) Object.assign(api[nodeId].inputs, params);
      }
    }
    console.log(`▶ Running: ${workflow_file}`);
    const r = await fetch(`${COMFY_URL}/prompt`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:api})});
    const data = await r.json();
    if (data.error) {
      console.error('❌ Error:', JSON.stringify(data.error,null,2));
      if (data.node_errors) console.error('Nodes:', JSON.stringify(data.node_errors,null,2));
    } else {
      console.log(`✓ Queued: ${data.prompt_id}`);
    }
    res.json(data);
  } catch(e) { console.error('❌',e.message); res.status(500).json({ error: "حدث خطأ في الخادم" }); }
});

// â•â•â• HISTORY / VIEW / STATUS â•â•â•
app.get('/api/history/:id', async (req,res) => {
  try { res.json(await (await fetch(`${COMFY_URL}/history/${req.params.id}`)).json()); }
  catch(e) { res.status(500).json({ error: "حدث خطأ في الخادم" }); }
});
app.get('/api/view', async (req,res) => {
  try {
    const qs = new URLSearchParams(req.query).toString();
    const r = await fetch(`${COMFY_URL}/view?${qs}`);
    res.set('Content-Type', r.headers.get('content-type')||'application/octet-stream');
    r.body.pipe(res);
  } catch(e) { res.status(500).json({ error: "حدث خطأ في الخادم" }); }
});
app.get('/api/status', async (req,res) => {
  if(!COMFY_ENABLED) return res.json({connected:false, disabled:true});
  try { res.json({connected:true,...await (await fetch(`${COMFY_URL}/system_stats`,{signal:AbortSignal.timeout(3000)})).json()}); }
  catch(e) { res.json({connected:false}); }
});
app.get('/api/workflows', (req,res) => {
  try { res.json({workflows:fs.readdirSync(WORKFLOWS_DIR).filter(f=>f.endsWith('.json'))}); }
  catch(e) { res.json({workflows:[]}); }
});

app.post('/api/generate', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'حدث خطأ في الإعداد' });
    }
    const { model = 'gemini-2.5-flash', parts, generationConfig, nanoKey, quality } = req.body || {};
    if (!Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ error: 'parts is required' });
    }
    // Validate prompt text length
    for (const part of parts) {
      if (typeof part?.text === 'string' && part.text.length > 32000) {
        return res.status(400).json({ error: 'النص طويل جداً (الحد الأقصى 32000 حرف)' });
      }
    }
    if (!(await deductCreditsForGeneration(req, res, model, { nanoKey, quality }))) return;

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig
        })
      }
    );

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || 'Prompt request failed' });
    }

    const responseParts = data?.candidates?.[0]?.content?.parts || [];
    const text = responseParts.map(part => part.text || '').join('\n').trim();
    const images = [];
    const audios = [];

    for (const part of responseParts) {
      const inlineData = part?.inlineData;
      if (!inlineData?.data) continue;
      const mimeType = inlineData.mimeType || 'application/octet-stream';
      if (mimeType.startsWith('image/')) {
        images.push(`data:${mimeType};base64,${inlineData.data}`);
        continue;
      }
      if (mimeType.startsWith('audio/L16')) {
        const rateMatch = mimeType.match(/rate=(\d+)/i);
        const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;
        const wavBase64 = pcmToWavBase64(inlineData.data, sampleRate, 1, 16);
        audios.push(`data:audio/wav;base64,${wavBase64}`);
        continue;
      }
      if (mimeType.startsWith('audio/')) {
        audios.push(`data:${mimeType};base64,${inlineData.data}`);
      }
    }

    res.json({ text, images, audios, ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/google-video', async (req, res) => {
  try {
    if (!checkPlanAccess(req, res, 'google-video')) return;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'حدث خطأ في الإعداد' });
    }

    const {
      prompt,
      aspectRatio = '16:9',
      resolution = '720p',
      durationSeconds = 8,
      imageBase64 = '',
      lastFrameBase64 = ''
    } = req.body || {};

    if (!String(prompt || '').trim()) {
      return res.status(400).json({ error: 'prompt is required' });
    }
    if (String(prompt).length > 2000)
      return res.status(400).json({ error: 'النص طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, 'veo', {}))) return;

    const instance = { prompt: String(prompt).trim() };
    if (imageBase64) {
      const img = parseDataUrl(imageBase64);
      instance.image = { inlineData: { mimeType: img.mimeType, data: img.data } };
    }

    const parameters = { aspectRatio, resolution, durationSeconds: Number(durationSeconds) || 8 };
    if (lastFrameBase64) {
      const last = parseDataUrl(lastFrameBase64);
      parameters.lastFrame = { inlineData: { mimeType: last.mimeType, data: last.data } };
    }

    const r = await fetch(`${GEMINI_BASE_URL}/models/veo-3.1-generate-preview:predictLongRunning`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instances: [instance],
        parameters
      })
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || 'Video generation request failed' });
    }

    res.json({ operationName: data?.name || '', ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/google-video/status', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY in environment' });
    }

    const operationName = String(req.query.operation || '');
    if (!operationName) {
      return res.status(400).json({ error: 'operation is required' });
    }
    if (!/^operations\/[a-zA-Z0-9\-_\/]+$/.test(operationName)) {
      return res.status(400).json({ error: 'Invalid operation name' });
    }

    const r = await fetch(`${GEMINI_BASE_URL}/${operationName}`, {
      headers: { 'x-goog-api-key': GEMINI_API_KEY }
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || 'Failed to fetch operation status' });
    }

    if (!data.done) {
      return res.json({ done: false });
    }

    const videoUri = data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri || '';
    if (!videoUri) {
      return res.json({ done: true, videoUrl: '' });
    }

    const videoResp = await fetch(videoUri, {
      headers: { 'x-goog-api-key': GEMINI_API_KEY }
    });
    if (!videoResp.ok) {
      return res.status(videoResp.status).json({ error: 'Failed to download generated video from Google' });
    }

    const buffer = Buffer.from(await videoResp.arrayBuffer());
    const fileName = `veo_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`;
    const filePath = path.join(VAULT_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    res.json({
      done: true,
      videoUrl: `/api/vault/file/${fileName}`,
      fileName
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// â•â•â• KIE VEO 3.1 â•â•â•
app.post('/api/kie-veo/generate', async (req, res) => {
  try {
    if (!checkPlanAccess(req, res, 'google-video')) return;
    const { prompt, model = 'veo3_fast', generationType, aspect_ratio = '16:9', imageUrls, seeds, enableTranslation = true } = req.body || {};
    if (!String(prompt || '').trim()) return res.status(400).json({ error: 'prompt is required' });
    if (String(prompt).length > 2000) return res.status(400).json({ error: 'النص طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, 'veo', {}))) return;
    const body = { prompt: String(prompt).trim(), model, aspect_ratio, enableTranslation };
    if (generationType && generationType !== 'auto') body.generationType = generationType;
    if (imageUrls && imageUrls.length) body.imageUrls = imageUrls;
    if (seeds) body.seeds = Number(seeds);
    const data = await kieFetch('/veo/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    res.json({ taskId: data?.data?.taskId || data?.taskId || '', ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie-veo/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) return res.status(400).json({ error: 'taskId is required' });
    const data = await kieFetch(`/generate/record-info?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.status || '').toLowerCase();
    const veoInfo = info?.response?.videoResponse || info?.response?.veoData || info?.response || info?.info || {};
    const resultUrls = veoInfo?.resultUrls || veoInfo?.videoUrls || (veoInfo?.url ? [veoInfo.url] : []);
    const thumbUrls = veoInfo?.imageUrls || veoInfo?.thumbUrls || [];
    res.json({ status, done: status === 'success' || status === 'completed', resultUrls, thumbUrls });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie-veo/extend', async (req, res) => {
  try {
    if (!checkPlanAccess(req, res, 'google-video')) return;
    const { taskId, prompt, model = 'fast', seeds } = req.body || {};
    if (!taskId || !String(prompt || '').trim()) return res.status(400).json({ error: 'taskId and prompt are required' });
    if (!(await deductCreditsForGeneration(req, res, 'veo', {}))) return;
    const body = { taskId, prompt: String(prompt).trim(), model };
    if (seeds) body.seeds = Number(seeds);
    const data = await kieFetch('/veo/extend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    res.json({ taskId: data?.data?.taskId || data?.taskId || '', ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie-veo/get-4k', async (req, res) => {
  try {
    if (!checkPlanAccess(req, res, 'google-video')) return;
    const { taskId, index = 0 } = req.body || {};
    if (!taskId) return res.status(400).json({ error: 'taskId is required' });
    const data = await kieFetch('/veo/get-4k-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId, index }) });
    res.json(data?.data || data || {});
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie-veo/get-1080p', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    const index = Number(req.query.index || 0);
    if (!taskId) return res.status(400).json({ error: 'taskId is required' });
    const data = await kieFetch(`/veo/get-1080p-video?taskId=${encodeURIComponent(taskId)}&index=${index}`);
    res.json(data?.data || data || {});
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// === RUNWAY VIDEO API ===
// Validate user-supplied URLs to prevent SSRF — only allow known CDN/storage domains
function isSafeExternalUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    // Block private/internal IP ranges
    const h = u.hostname.toLowerCase();
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.|\[::1\])/.test(h)) return false;
    if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost')) return false;
    return true;
  } catch { return false; }
}

app.post('/api/runway-gen/generate', async (req, res) => {
  try {
    const { prompt, imageUrl, duration, quality, aspectRatio, waterMark = '' } = req.body || {};
    if (!String(prompt || '').trim()) return res.status(400).json({ error: 'prompt is required' });
    if (String(prompt).length > 1800) return res.status(400).json({ error: 'prompt too long (max 1800 chars)' });
    if (![5, 10].includes(Number(duration))) return res.status(400).json({ error: 'duration must be 5 or 10' });
    if (!['720p', '1080p'].includes(quality)) return res.status(400).json({ error: 'quality must be 720p or 1080p' });
    if (quality === '1080p' && Number(duration) === 10) return res.status(400).json({ error: '1080p is only available for 5-second videos' });
    if (!await deductCreditsForGeneration(req, res, 'runway', { duration: Number(duration), quality })) return;
    const body = { prompt: String(prompt).trim(), duration: Number(duration), quality, waterMark: String(waterMark || '') };
    if (imageUrl && isSafeExternalUrl(imageUrl)) body.imageUrl = imageUrl;
    else if (imageUrl) return res.status(400).json({ error: 'Invalid or unsafe imageUrl' });
    if (!imageUrl && aspectRatio) body.aspectRatio = aspectRatio;
    const data = await kieFetch('/runway/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    res.json({ taskId: data?.data?.taskId || '', ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || 'حدث خطأ في الخادم' });
  }
});

app.get('/api/runway-gen/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId || !/^[a-zA-Z0-9_\-]{8,72}$/.test(taskId)) return res.status(400).json({ error: 'invalid taskId' });
    const data = await kieFetch(`/runway/record-detail?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || {};
    res.json({
      state: info.state || 'wait',
      done: info.state === 'success',
      failed: info.state === 'fail',
      videoUrl: info.videoInfo?.videoUrl || '',
      imageUrl: info.videoInfo?.imageUrl || '',
      failMsg: info.failMsg || '',
      expireFlag: info.expireFlag || 0
    });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || 'حدث خطأ في الخادم' });
  }
});

app.post('/api/runway-gen/extend', async (req, res) => {
  try {
    const { taskId, prompt, quality = '720p', waterMark = '' } = req.body || {};
    if (!taskId || !/^[a-zA-Z0-9_\-]{8,72}$/.test(taskId)) return res.status(400).json({ error: 'invalid taskId' });
    if (!String(prompt || '').trim()) return res.status(400).json({ error: 'prompt is required' });
    if (!['720p', '1080p'].includes(quality)) return res.status(400).json({ error: 'quality must be 720p or 1080p' });
    if (!await deductCreditsForGeneration(req, res, 'runway', { duration: 5, quality })) return;
    const data = await kieFetch('/runway/extend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId, prompt: String(prompt).trim(), quality, waterMark: String(waterMark || '') }) });
    res.json({ taskId: data?.data?.taskId || '' });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || 'حدث خطأ في الخادم' });
  }
});

app.post('/api/runway-gen/aleph', async (req, res) => {
  try {
    const { prompt, videoUrl, aspectRatio, waterMark = '' } = req.body || {};
    if (!String(prompt || '').trim()) return res.status(400).json({ error: 'prompt is required' });
    if (!videoUrl || !isSafeExternalUrl(videoUrl)) return res.status(400).json({ error: 'valid https videoUrl is required' });
    if (!await deductCreditsForGeneration(req, res, 'aleph', {})) return;
    const body = { prompt: String(prompt).trim(), videoUrl: String(videoUrl), waterMark: String(waterMark || '') };
    if (aspectRatio) body.aspectRatio = aspectRatio;
    const data = await kieFetch('/aleph/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    res.json({ taskId: data?.data?.taskId || '' });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || 'حدث خطأ في الخادم' });
  }
});

app.get('/api/runway-gen/aleph-status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId || !/^[a-zA-Z0-9_\-]{8,72}$/.test(taskId)) return res.status(400).json({ error: 'invalid taskId' });
    const data = await kieFetch(`/aleph/record-info?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || {};
    const done = info.successFlag === 1;
    const failed = !done && (info.errorCode !== 0 || !!info.errorMessage);
    res.json({
      done,
      failed,
      videoUrl: info.response?.resultVideoUrl || '',
      imageUrl: info.response?.resultImageUrl || '',
      errorMessage: info.errorMessage || ''
    });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || 'حدث خطأ في الخادم' });
  }
});

app.get('/api/kie/credits', async (req, res) => {
  try {
    let data;
    try {
      data = await kieFetch('/chat/credit');
    } catch (primaryError) {
      data = await kieFetch('/user/credits');
    }
    const creditInfo = data?.data || data?.result || data || {};
    res.json({
      credits: typeof creditInfo === 'number'
        ? creditInfo
        : creditInfo?.credits ?? creditInfo?.remainingCredits ?? creditInfo?.balance ?? null,
      totalCredits: creditInfo?.totalCredits ?? creditInfo?.total ?? null
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/upload-base64', requireSignedIn, async (req, res) => {
  try {
    if (!KIE_API_KEY) {
      return res.status(500).json({ error: 'Missing KIE_API_KEY in environment' });
    }

    const { imageBase64 = '' } = req.body || {};
    if (!String(imageBase64).trim()) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const parsed = parseDataUrl(imageBase64);
    const response = await fetch(`${KIE_UPLOAD_BASE_URL}/api/file-base64-upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base64Data: imageBase64,
        uploadPath: 'images/user-uploads'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.message || data?.msg || `Kie upload failed (${response.status})` });
    }

    const fileUrl =
      data?.data?.downloadUrl ||
      data?.data?.url ||
      data?.data?.fileUrl ||
      data?.downloadUrl ||
      data?.url ||
      '';
    if (!fileUrl) {
      return res.status(500).json({
        error: 'Kie upload succeeded but no file URL was returned' });
    }

    res.json({ url: fileUrl });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// Helper: extract URL from KIE upload response
function extractKieFileUrl(data) {
  return (
    data?.data?.downloadUrl ||
    data?.data?.url ||
    data?.data?.fileUrl ||
    data?.data?.file_url ||
    data?.downloadUrl ||
    data?.url ||
    data?.fileUrl ||
    ''
  );
}

// Helper: multipart upload to a specific KIE endpoint
async function kieMultipartUploadToEndpoint(url, fileBuffer, fileName, mimeType) {
  const fd = new FormData();
  fd.append('file', fileBuffer, { filename: fileName, contentType: mimeType });
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KIE_API_KEY}`, ...fd.getHeaders() },
    body: fd
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { response, data };
}

// Helper: base64 upload to KIE CDN
async function kieBase64Upload(fileBuffer, fileName, mimeType) {
  const isVideo = mimeType.startsWith('video/');
  const dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  const response = await fetch(`${KIE_UPLOAD_BASE_URL}/api/file-base64-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KIE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base64Data: dataUrl,
      uploadPath: isVideo ? 'videos/user-uploads' : 'images/user-uploads',
      fileName
    })
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { response, data };
}

// Main upload function: tries multiple endpoints in order
// Returns { response, data, fileUrl } from the first successful attempt
async function kieUploadFile(fileBuffer, fileName, mimeType) {
  const isVideo = mimeType.startsWith('video/');

  // Endpoints to try in order (multipart preferred â€” returns proper CDN URLs for Kling)
  const multipartEndpoints = [
    `${KIE_API_BASE_URL}/tools/upload`,      // Official File Upload API
    `${KIE_API_BASE_URL}/files/upload`,       // Alternative path
    `${KIE_API_BASE_URL}/tool/upload`,        // Another variant
  ];

  for (const endpoint of multipartEndpoints) {
    try {
      const { response, data } = await kieMultipartUploadToEndpoint(endpoint, fileBuffer, fileName, mimeType);
      const fileUrl = extractKieFileUrl(data);
      // Accept if HTTP OK AND we got a URL from the expected CDN
      if (response.ok && fileUrl && !fileUrl.includes('kieai.redpandaai.co')) {
        return { response, data, fileUrl };
      }
    } catch { /* try next */ }
  }

  // For videos: also try multipart on the CDN upload server
  if (isVideo) {
    try {
      const { response, data } = await kieMultipartUploadToEndpoint(
        `${KIE_UPLOAD_BASE_URL}/api/file-upload`, fileBuffer, fileName, mimeType
      );
      const fileUrl = extractKieFileUrl(data);
      if (response.ok && fileUrl) {
        return { response, data, fileUrl };
      }
    } catch { /* try next */ }
  }

  // Last resort: base64 upload (OK for images, may fail for large videos)
  const { response, data } = await kieBase64Upload(fileBuffer, fileName, mimeType);
  const fileUrl = extractKieFileUrl(data);
  return { response, data, fileUrl };
}

app.post('/api/kie/upload-file', requireSignedIn, uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!KIE_API_KEY) {
      return res.status(500).json({ error: 'Missing KIE_API_KEY in environment' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'file is required' });
    }
    if (!isAllowedUpload(req.file, ALLOWED_MEDIA_MIMES)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      auditLog('upload.rejected', 'kie name="' + (req.file.originalname||'').slice(0,80) + '" mime="' + req.file.mimetype + '"', req);
      return res.status(400).json({ error: 'نوع الملف غير مسموح' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const mimeType = req.file.mimetype || 'application/octet-stream';
    const isVideo = mimeType.startsWith('video/');

    // path.extname returns '.jpg' (with leading dot) — strip it so we don't get double-dot filenames
    const rawExt = path.extname(req.file.originalname || '').replace(/[^a-zA-Z0-9]/g, '') || (isVideo ? 'mp4' : 'png');
    const safeFileName = `upload_${Date.now()}.${rawExt}`;

    try { fs.unlinkSync(req.file.path); } catch {}

    const { response, data, fileUrl } = await kieUploadFile(fileBuffer, safeFileName, mimeType);

    console.log(`[Upload] file="${safeFileName}" mime="${mimeType}" url="${fileUrl}" status=${response.status}`);

    if (!response.ok || data?.success === false) {
      const apiStatus =
        Number.isFinite(Number(data?.code)) && Number(data.code) >= 400
          ? Number(data.code)
          : response.status || 400;
      return res.status(apiStatus).json({
        error: data?.msg || data?.message || `KIE file upload failed (${apiStatus})` });
    }

    if (!fileUrl) {
      return res.status(500).json({
        error: 'KIE file upload succeeded but no file URL was returned' });
    }

    auditLog('upload.success', 'kie name="' + safeFileName + '" user="' + (req.currentUser?.email||'unknown') + '"', req);
    res.json({ url: fileUrl });
  } catch (e) {
    console.error('[upload-file] ERROR:', e.message);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/kling/create', async (req, res) => {
  try {
    const {
      mode = 'text2video',
      modelName = 'kling-3.0/video',
      prompt = '',
      negativePrompt = '',
      aspectRatio = '16:9',
      duration = '5',
      imageUrls = [],
      imageUrl = '',
      generationMode = 'pro',
      sound = true,
      multiShots = false,
      multiPrompt = [],
      klingElements = [],
      videoUrls = [],
      audioUrls = [],
      audioUrl = '',
      characterOrientation = 'video',
      tailImageUrl = '',
      cfgScale = null
    } = req.body || {};

    if (!checkPlanAccess(req, res, modelName, generationMode)) return;
    // Server-side input validation
    if (String(prompt || '').length > 2000)
      return res.status(400).json({ error: 'النص طويل جداً (الحد الأقصى 2000 حرف)' });
    if (String(negativePrompt || '').length > 500)
      return res.status(400).json({ error: 'النص السلبي طويل جداً' });
    // Deduct credits server-side
    if (!(await deductCreditsForGeneration(req, res, modelName, { duration: Number(duration)||5, mode: generationMode, audio: sound, resolution: String(modelName).includes('/motion-control') ? (generationMode === 'pro' ? '1080p' : '720p') : '720p' }))) return;

    const input = {};
    if (String(modelName).startsWith('kling/ai-avatar')) {
      const avatarImage = String(imageUrl || imageUrls?.[0] || '').trim();
      const avatarAudio = String(audioUrl || audioUrls?.[0] || '').trim();
      if (!avatarImage) {
        return res.status(400).json({ error: 'image_url is required for Kling AI Avatar' });
      }
      if (!avatarAudio) {
        return res.status(400).json({ error: 'audio_url is required for Kling AI Avatar' });
      }
      if (!String(prompt || '').trim()) {
        return res.status(400).json({ error: 'prompt is required for Kling AI Avatar' });
      }
      input.image_url = avatarImage;
      input.audio_url = avatarAudio;
      input.prompt = String(prompt).trim();
    } else if (String(modelName) === 'kling/v2-5-turbo-image-to-video-pro') {
      if (!String(prompt || '').trim()) {
        return res.status(400).json({ error: 'prompt is required for Kling 2.5 Turbo image-to-video' });
      }
      if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ error: 'image_url is required for Kling 2.5 Turbo image-to-video' });
      }

      input.prompt = String(prompt).trim();
      input.image_url = imageUrls[0];
      if (String(tailImageUrl || '').trim()) input.tail_image_url = String(tailImageUrl).trim();
      if (String(duration || '').trim()) input.duration = String(duration);
      if (String(negativePrompt || '').trim()) input.negative_prompt = String(negativePrompt).trim();
      if (cfgScale !== null && cfgScale !== '' && typeof cfgScale !== 'undefined') input.cfg_scale = Number(cfgScale);
    } else if (String(modelName).includes('/motion-control')) {
      if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ error: 'input_urls are required for motion control' });
      }
      if (!Array.isArray(videoUrls) || videoUrls.length === 0) {
        return res.status(400).json({ error: 'video_urls are required for motion control' });
      }

      if (String(prompt || '').trim()) input.prompt = String(prompt).trim();
      input.input_urls = imageUrls.filter(Boolean);
      input.video_urls = videoUrls.filter(Boolean);
      input.character_orientation = characterOrientation;
      input.background_source = 'input_video';
      input.mode = generationMode === 'pro' ? '1080p' : '720p';

      // Debug: log what we're sending to Kling
      console.log('[Motion Control] image URLs:', input.input_urls);
      console.log('[Motion Control] video URLs:', input.video_urls);
      console.log('[Motion Control] mode:', input.mode);
    } else {
      if (!multiShots && !String(prompt).trim()) {
        return res.status(400).json({ error: 'prompt is required' });
      }
      if (multiShots && (!Array.isArray(multiPrompt) || multiPrompt.length === 0)) {
        return res.status(400).json({ error: 'multiPrompt is required when multiShots is enabled' });
      }
      input.duration = String(duration);
      input.mode = generationMode;
      input.multi_shots = Boolean(multiShots);
      input.sound = Boolean(sound);

      if (String(prompt || '').trim()) input.prompt = String(prompt).trim();
      if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
        input.aspect_ratio = aspectRatio;
      }
      if (Array.isArray(imageUrls) && imageUrls.length > 0) {
        input.image_urls = imageUrls.filter(Boolean);
      }
      if (multiShots) {
        input.sound = true;
        input.multi_prompt = multiPrompt
          .filter(item => String(item?.prompt || '').trim())
          .map(item => ({
            prompt: String(item.prompt).trim(),
            duration: Number(item.duration) || 3
          }));
      }
      if (Array.isArray(klingElements) && klingElements.length > 0) {
        input.kling_elements = klingElements;
      }
    }

    const payload = {
      model: modelName,
      input
    };

    const data = await kieFetch('/jobs/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    res.json({
      taskId: data?.data?.taskId || data?.taskId || data?.data?.id || ''
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/image/create', async (req, res) => {
  try {
    const { model = '', input = {} } = req.body || {};
    if (!String(model).trim()) {
      return res.status(400).json({ error: 'model is required' });
    }
    if (String(input?.prompt || '').length > 2000)
      return res.status(400).json({ error: 'النص طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, String(model), {}))) return;

    const data = await kieFetch('/jobs/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input })
    });

    const taskId = data?.data?.taskId || data?.taskId || data?.data?.id || '';
    console.log(`[image/create] model="${model}" taskId="${taskId}" response:`, JSON.stringify(data).substring(0, 300));
    res.json({
      taskId,
      ...(req.creditInfo || {})
    });
  } catch (e) {
    console.error(`[image/create] ERROR model="${req.body?.model}":`, e.message, e.payload ? JSON.stringify(e.payload).substring(0,300) : '');
    res.status(e.statusCode || 500).json({ error: e.message || 'حدث خطأ في الخادم' });
  }
});

app.get('/api/kie/image/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.state || info?.status || info?.taskStatus || data?.status || '').toLowerCase();
    const resultJson = info?.resultJson || info?.result || {};
    const parsedResult =
      typeof resultJson === 'string'
        ? (() => {
            try {
              return JSON.parse(resultJson);
            } catch {
              return {};
            }
          })()
        : resultJson;

    let imageUrls =
      parsedResult?.resultUrls ||
      parsedResult?.imageUrls ||
      info?.resultUrls ||
      info?.imageUrls ||
      [];

    if (!Array.isArray(imageUrls)) imageUrls = imageUrls ? [imageUrls] : [];

    const normalizedUrls = [];
    for (const url of imageUrls) {
      try {
        const download = await kieFetch('/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: url })
        });
        normalizedUrls.push(download?.data?.downloadUrl || download?.downloadUrl || url);
      } catch {
        normalizedUrls.push(url);
      }
    }

    res.json({
      status,
      done: ['success', 'succeed', 'completed'].includes(status),
      failed: ['fail', 'failed', 'error'].includes(status),
      failMsg: info?.failMsg || data?.msg || '',
      taskId,
      imageUrls: normalizedUrls
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie/kling/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.state || info?.status || info?.taskStatus || data?.status || '').toLowerCase();
    const resultJson = info?.resultJson || info?.result || {};
    const parsedResult =
      typeof resultJson === 'string'
        ? (() => {
            try {
              return JSON.parse(resultJson);
            } catch {
              return {};
            }
          })()
        : resultJson;

    let videoUrls =
      parsedResult?.resultUrls ||
      parsedResult?.videoUrls ||
      info?.resultUrls ||
      info?.videoUrls ||
      [];

    if (!Array.isArray(videoUrls)) videoUrls = videoUrls ? [videoUrls] : [];

    const normalizedUrls = [];
    for (const url of videoUrls) {
      try {
        const download = await kieFetch('/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: url })
        });
        normalizedUrls.push(download?.data?.downloadUrl || download?.downloadUrl || url);
      } catch {
        normalizedUrls.push(url);
      }
    }

    res.json({
      status,
      done: ['success', 'succeed', 'completed'].includes(status),
      failed: ['fail', 'failed', 'error'].includes(status),
      failMsg: info?.failMsg || data?.msg || '',
      taskId,
      videoUrls: normalizedUrls
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/elevenlabs/create', async (req, res) => {
  try {
    const {
      model = 'elevenlabs/text-to-dialogue-v3',
      input = {}
    } = req.body || {};

    if (!String(model).trim()) {
      return res.status(400).json({ error: 'model is required' });
    }
    if (String(input?.text || input?.prompt || '').length > 2000)
      return res.status(400).json({ error: 'النص طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, String(model), { textLength: String(input?.text || input?.prompt || '').length }))) return;

    const data = await kieFetch('/jobs/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input
      })
    });

    res.json({
      taskId: data?.data?.taskId || data?.taskId || data?.data?.id || '',
      ...(req.creditInfo || {})
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie/elevenlabs/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.status || info?.taskStatus || data?.status || '').toLowerCase();
    const resultJson = info?.resultJson || info?.result || {};
    const parsedResult =
      typeof resultJson === 'string'
        ? (() => {
            try {
              return JSON.parse(resultJson);
            } catch {
              return {};
            }
          })()
        : resultJson;

    let audioUrls =
      parsedResult?.resultUrls ||
      parsedResult?.audioUrls ||
      info?.resultUrls ||
      info?.audioUrls ||
      [];

    if (!Array.isArray(audioUrls)) audioUrls = audioUrls ? [audioUrls] : [];

    const normalizedUrls = [];
    for (const url of audioUrls) {
      try {
        const download = await kieFetch('/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: url })
        });
        normalizedUrls.push(download?.data?.downloadUrl || download?.downloadUrl || url);
      } catch {
        normalizedUrls.push(url);
      }
    }

    res.json({
      status,
      done: ['success', 'succeed', 'completed'].includes(status),
      failed: ['fail', 'failed', 'error'].includes(status),
      taskId,
      audioUrls: normalizedUrls
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/suno/create', async (req, res) => {
  try {
    const {
      prompt = '',
      customMode = false,
      instrumental = false,
      model = 'V5',
      style = '',
      title = '',
      negativeTags = '',
      vocalGender = '',
      styleWeight = null,
      weirdnessConstraint = null,
      audioWeight = null,
      personaId = '',
      personaModel = '',
      callBackUrl = ''
    } = req.body || {};

    const hasPrompt = String(prompt || '').trim().length > 0;
    const hasStyle = String(style || '').trim().length > 0;
    const hasTitle = String(title || '').trim().length > 0;

    if (customMode) {
      if (instrumental) {
        if (!hasStyle || !hasTitle) {
          return res.status(400).json({ error: 'Style and Title are required for Custom Mode Instrumental' });
        }
      } else if (!hasPrompt || !hasStyle || !hasTitle) {
        return res.status(400).json({ error: 'Prompt, Style, and Title are required for Custom Mode' });
      }
    } else if (!hasPrompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    if (String(prompt).length > 500) return res.status(400).json({ error: 'الوصف طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, 'suno', { sunoModel: model }))) return;

    const payload = {
      prompt,
      customMode: !!customMode,
      instrumental: !!instrumental,
      model
    };

    if (hasStyle) payload.style = style;
    if (hasTitle) payload.title = title;
    if (String(negativeTags || '').trim()) payload.negativeTags = negativeTags;
    if (String(vocalGender || '').trim()) payload.vocalGender = vocalGender;
    if (typeof styleWeight === 'number') payload.styleWeight = styleWeight;
    if (typeof weirdnessConstraint === 'number') payload.weirdnessConstraint = weirdnessConstraint;
    if (typeof audioWeight === 'number') payload.audioWeight = audioWeight;
    if (String(personaId || '').trim()) payload.personaId = personaId;
    if (String(personaModel || '').trim()) payload.personaModel = personaModel;
    // callBackUrl is required by KIE Suno API â€” use provided or fallback to a dummy URL
    payload.callBackUrl = String(callBackUrl || '').trim() || 'https://example.com/suno-cb';

    const data = await kieFetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const taskId = data?.data?.taskId || data?.taskId || data?.data?.id || '';
    if (!taskId) {
      return res.status(502).json({ error: 'Kie did not return taskId' });
    }

    res.json({ taskId, ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie/suno/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/generate/record-info?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.status || info?.state || data?.status || '').toLowerCase();
    const sunoData = info?.response?.sunoData || info?.sunoData || info?.response?.data || [];

    const audioUrls = [];
    const imageUrls = [];
    const pushUrl = (val, list) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach(u => pushUrl(u, list));
        return;
      }
      if (typeof val === 'string') list.push(val);
    };

    const readEntry = (entry) => {
      if (!entry || typeof entry !== 'object') return;
      pushUrl(entry.audioUrl || entry.audio_url || entry.url, audioUrls);
      pushUrl(entry.imageUrl || entry.image_url, imageUrls);
    };

    if (Array.isArray(sunoData)) {
      sunoData.forEach(readEntry);
    } else if (sunoData && typeof sunoData === 'object') {
      Object.values(sunoData).forEach(readEntry);
    }

    readEntry(info);

    const uniqueAudio = Array.from(new Set(audioUrls));
    const normalizedAudio = [];
    for (const url of uniqueAudio) {
      try {
        const download = await kieFetch('/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: url })
        });
        normalizedAudio.push(download?.data?.downloadUrl || download?.downloadUrl || url);
      } catch {
        normalizedAudio.push(url);
      }
    }

      res.json({
        status,
        done: ['success', 'first_success', 'text_success'].includes(status) || normalizedAudio.length > 0,
        failed: status.includes('fail') || status.includes('error') || status.includes('exception') || status.includes('sensitive'),
        failMsg: info?.failMsg || data?.msg || '',
        taskId,
        audioUrls: normalizedAudio,
        imageUrls
      });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/hailuo/create', async (req, res) => {
  try {
    const { model = 'hailuo/2-3-image-to-video-pro', input = {} } = req.body || {};
    if (!String(model || '').trim()) {
      return res.status(400).json({ error: 'model is required' });
    }
    if (!checkPlanAccess(req, res, model)) return;
    if (String(input?.prompt || '').length > 2000)
      return res.status(400).json({ error: 'النص طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, String(model), { duration: Number(input?.duration||6), resolution: String(input?.resolution||'720p') }))) return;

    const data = await kieFetch('/jobs/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input })
    });

    const taskId = data?.data?.taskId || data?.taskId || data?.data?.id || '';
    if (!taskId) {
      return res.status(502).json({ error: 'Kie did not return taskId' });
    }

    res.json({ taskId, ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie/hailuo/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.state || info?.status || info?.taskStatus || data?.status || '').toLowerCase();
    const done = ['success', 'succeeded', 'done', 'completed'].includes(status);
    const failed = ['fail', 'failed', 'error'].includes(status);
    let resultUrls = info?.resultUrls || info?.resultUrl || info?.result?.resultUrls || [];
    const resultJson = info?.resultJson || info?.result || {};

    if (typeof resultJson === 'string') {
      try {
        const parsed = JSON.parse(resultJson);
        if (Array.isArray(parsed?.resultUrls)) resultUrls = parsed.resultUrls;
      } catch {}
    }

    if (!Array.isArray(resultUrls)) resultUrls = resultUrls ? [resultUrls] : [];

    const normalizedUrls = [];
    for (const url of resultUrls) {
      try {
        const download = await kieFetch('/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: url })
        });
        normalizedUrls.push(download?.data?.downloadUrl || download?.downloadUrl || url);
      } catch {
        normalizedUrls.push(url);
      }
    }

    res.json({
      status,
      done,
      failed,
      failMsg: info?.failMsg || info?.error || '',
      taskId,
      resultUrls: normalizedUrls
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/gpt54/create', async (req, res) => {
  try {
    const {
      prompt = '',
      imageUrl = '',
      tools = [],
      reasoning,
      model
    } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    if (String(prompt).length > 8000)
      return res.status(400).json({ error: 'النص طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, String(model || 'gpt-5-2'), {}))) return;

    const content = [{ type: 'input_text', text: prompt }];
    if (imageUrl) {
      content.push({ type: 'input_image', image_url: imageUrl });
    }

    const normalizeModelKey = (value) => String(value || '').trim().toLowerCase().replace(/\./g, '-');
    const modelAliases = {
      'gpt-5-2-latest': 'gpt-5-2',
      'gpt-5-2-auto': 'gpt-5-2',
      'gpt5-2': 'gpt-5-2',
      'latest': 'gpt-5-2',
      'auto': 'gpt-5-2'
    };
    const requestedRaw = String(model || 'gpt-5-2').trim() || 'gpt-5-2';
    const normalizedKey = normalizeModelKey(requestedRaw);
    const requestedModel = modelAliases[normalizedKey] || requestedRaw;
    const fallbackChain = [
      requestedModel,
      ...KIE_GPT_FALLBACKS.filter(m => m !== requestedModel)
    ];

    const basePayload = {
      stream: false,
      input: [{ role: 'user', content }]
    };

    if (Array.isArray(tools) && tools.length) {
      basePayload.tools = tools;
    }
    if (reasoning && typeof reasoning === 'object') {
      basePayload.reasoning = reasoning;
    }

    const shouldFallback = (err) => {
      const status = err?.statusCode || 0;
      const msg = String(err?.message || '').toLowerCase();
      if (status >= 500) return true;
      if (status === 429) return true;
      if (msg.includes('timeout') || msg.includes('timed out')) return true;
      return false;
    };

    let lastError = null;
    for (const modelName of fallbackChain) {
      try {
        let data;
        if (modelName === 'gpt-5-2') {
          const gpt52Messages = [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                ...(imageUrl ? [{ type: 'image_url', image_url: { url: imageUrl } }] : [])
              ]
            }
          ];
          const gpt52Tools = Array.isArray(tools) && tools.length
            ? tools.map(tool => {
                if (tool?.type === 'web_search') {
                  return { type: 'function', function: { name: 'web_search' } };
                }
                if (tool?.type === 'function' && tool?.function?.name) {
                  return { type: 'function', function: { name: tool.function.name } };
                }
                return null;
              }).filter(Boolean)
            : undefined;
          const effortRaw = String(reasoning?.effort || '').toLowerCase();
          const effort = (effortRaw === 'low' || effortRaw === 'minimal') ? 'low' : 'high';
          const gpt52Payload = {
            messages: gpt52Messages,
            reasoning_effort: effort,
            stream: false
          };
          if (gpt52Tools && gpt52Tools.length) gpt52Payload.tools = gpt52Tools;
          data = await kieGpt52Fetch(gpt52Payload);
        } else {
          const payload = { ...basePayload, model: modelName };
          if (Array.isArray(payload.tools) && payload.tools.some(tool => tool?.type === 'function')) {
            payload.tool_choice = 'auto';
          }
          data = await kieCodexFetch(payload);
        }

        const outputBlocks = data?.output || data?.data?.output || [];
        const texts = [];
        const seen = new Set();
        const pushText = (value) => {
          if (typeof value !== 'string') return;
          const trimmed = value.trim();
          if (!trimmed) return;
          if (seen.has(trimmed)) return;
          seen.add(trimmed);
          texts.push(trimmed);
        };
        const readBlock = (block) => {
          if (!block || typeof block !== 'object') return;
          if (Array.isArray(block.content)) {
            block.content.forEach(item => {
              if (!item || typeof item !== 'object') return;
              if (item?.text) pushText(item.text);
              if (item?.type === 'output_text' && item?.text) pushText(item.text);
              if (item?.type === 'text' && item?.text) pushText(item.text);
            });
          }
          if (block?.text) pushText(block.text);
        };
        if (Array.isArray(outputBlocks)) outputBlocks.forEach(readBlock);

        if (Array.isArray(data?.choices)) {
          data.choices.forEach(choice => {
            if (choice?.message?.content) pushText(choice.message.content);
            if (choice?.text) pushText(choice.text);
          });
        }

        pushText(data?.output_text);
        pushText(data?.data?.output_text);
        pushText(data?.text);
        pushText(data?.data?.text);

        let outputText = texts.join('\n').trim();
        const collapseRepeatedText = (value = '') => {
          const trimmed = String(value).trim();
          if (!trimmed) return trimmed;
          const simpleSeps = ['\n\n', '\n', '  '];
          for (const sep of simpleSeps) {
            if (!trimmed.includes(sep)) continue;
            const parts = trimmed.split(sep).map(p => p.trim()).filter(Boolean);
            if (parts.length === 2 && parts[0] === parts[1]) return parts[0];
          }
          if (trimmed.length % 2 === 0) {
            const half = trimmed.length / 2;
            if (trimmed.slice(0, half) === trimmed.slice(half)) {
              return trimmed.slice(0, half).trim();
            }
          }
          return trimmed;
        };
        const dedupeLines = (value = '') => {
          const lines = String(value)
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);
          if (!lines.length) return String(value).trim();
          const result = [];
          const seenLine = new Set();
          for (const line of lines) {
            if (result[result.length - 1] === line) continue;
            if (seenLine.has(line) && lines.length <= 3) continue;
            seenLine.add(line);
            result.push(line);
          }
          return result.join('\n');
        };
        outputText = dedupeLines(collapseRepeatedText(outputText));
        if (!outputText) {
          // نص فارغ → نستمر في Fallback
          const emptyErr = new Error(`Model ${modelName} returned empty response`);
          emptyErr.statusCode = 502;
          throw emptyErr;
        }
        return res.json({
          outputText,
          modelUsed: modelName,
          attemptedModels: fallbackChain
        });
      } catch (err) {
        lastError = err;
        if (!shouldFallback(err)) break;
      }
    }

    throw lastError || new Error('Kie request failed');
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/sora/create', async (req, res) => {
  try {
    const { model = 'sora-2-text-to-video', input = {} } = req.body || {};
    if (String(input?.prompt || '').length > 2000)
      return res.status(400).json({ error: 'النص طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, String(model), {
      duration: Number(input?.duration || 5),
      n_frames: Number(input?.n_frames || input?.frames || 10)
    }))) return;
    const soraPayload = { model, input };
    const data = await kieFetch('/jobs/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(soraPayload)
    });

    const taskId =
      data?.data?.taskId ||
      data?.data?.task_id ||
      data?.taskId ||
      data?.task_id ||
      data?.data?.id ||
      data?.id ||
      data?.result?.taskId ||
      data?.result?.task_id ||
      '';
    if (!taskId) {
      const providerMessage =
        data?.message ||
        data?.msg ||
        data?.error?.message ||
        data?.error ||
        data?.data?.message ||
        data?.data?.msg ||
        data?.result?.message ||
        data?.result?.msg ||
        '';
      console.error(`[sora/create] Missing taskId for model="${model}". Response:`, JSON.stringify(data).substring(0, 600));
      return res.status(502).json({
        error: providerMessage || 'Kie did not return taskId',
        details: {
          code: data?.code ?? data?.status ?? null,
          model
        }
      });
    }
    res.json({ taskId, ...(req.creditInfo || {}) });
  } catch (e) {
    console.error(`[sora/create] ERROR model="${req.body?.model}":`, e.message, e.payload ? JSON.stringify(e.payload).substring(0,600) : '');
    res.status(e.statusCode || 500).json({ error: e.message || "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie/sora/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.state || info?.status || info?.taskStatus || data?.status || '').toLowerCase();
    const done = ['success', 'succeeded', 'done', 'completed'].includes(status);
    const failed = ['fail', 'failed', 'error'].includes(status);
    let resultUrls = info?.resultUrls || info?.result?.resultUrls || [];
    let resultWatermarkUrls = info?.resultWaterMarkUrls || info?.result?.resultWaterMarkUrls || [];
    let resultObject = info?.resultObject || info?.result?.resultObject || null;

    if (typeof info?.resultJson === 'string') {
      try {
        const parsed = JSON.parse(info.resultJson);
        if (Array.isArray(parsed?.resultUrls)) resultUrls = parsed.resultUrls;
        if (Array.isArray(parsed?.resultWaterMarkUrls)) resultWatermarkUrls = parsed.resultWaterMarkUrls;
        if (parsed?.resultObject) resultObject = parsed.resultObject;
      } catch {}
    }

    if (!Array.isArray(resultUrls)) resultUrls = resultUrls ? [resultUrls] : [];
    if (!Array.isArray(resultWatermarkUrls)) resultWatermarkUrls = resultWatermarkUrls ? [resultWatermarkUrls] : [];

    const normalizedUrls = [];
    for (const url of resultUrls) {
      try {
        const download = await kieFetch('/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: url })
        });
        normalizedUrls.push(download?.data?.downloadUrl || download?.downloadUrl || url);
      } catch {
        normalizedUrls.push(url);
      }
    }

    res.json({
      status,
      done,
      failed,
      failMsg: info?.failMsg || info?.error || '',
      taskId,
      resultUrls: normalizedUrls,
      resultWatermarkUrls,
      resultObject
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/grok/create', async (req, res) => {
  try {
    const { model = 'grok-imagine/text-to-video', input = {} } = req.body || {};
    if (String(input?.prompt || '').length > 2000)
      return res.status(400).json({ error: 'النص طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, String(model), {}))) return;
    const payload = { model, input };
    const data = await kieFetch('/jobs/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const taskId = data?.data?.taskId || data?.taskId || data?.data?.id || '';
    if (!taskId) {
      return res.status(502).json({ error: 'Kie did not return taskId' });
    }
    res.json({ taskId, ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie/grok/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.state || info?.status || info?.taskStatus || data?.status || '').toLowerCase();
    const done = ['success', 'succeeded', 'done', 'completed'].includes(status);
    const failed = ['fail', 'failed', 'error'].includes(status);
    let resultUrls = info?.resultUrls || info?.result?.resultUrls || [];

    if (typeof info?.resultJson === 'string') {
      try {
        const parsed = JSON.parse(info.resultJson);
        if (Array.isArray(parsed?.resultUrls)) resultUrls = parsed.resultUrls;
      } catch {}
    }

    if (!Array.isArray(resultUrls)) resultUrls = resultUrls ? [resultUrls] : [];

    res.json({
      status,
      done,
      failed,
      failMsg: info?.failMsg || info?.error || '',
      taskId,
      resultUrls
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/infinitalk/create', async (req, res) => {
  try {
    const { model = 'infinitalk/from-audio', input = {} } = req.body || {};
    if (!String(model || '').trim()) {
      return res.status(400).json({ error: 'model is required' });
    }
    if (!checkPlanAccess(req, res, model)) return;
    if (!(await deductCreditsForGeneration(req, res, String(model), {}))) return;

    const data = await kieFetch('/jobs/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input })
    });

    const taskId = data?.data?.taskId || data?.taskId || data?.data?.id || '';
    if (!taskId) {
      return res.status(502).json({ error: 'Kie did not return taskId' });
    }

    res.json({ taskId, ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie/infinitalk/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.state || info?.status || info?.taskStatus || data?.status || '').toLowerCase();
    const resultJson = info?.resultJson || info?.result || {};
    const parsedResult =
      typeof resultJson === 'string'
        ? (() => {
            try {
              return JSON.parse(resultJson);
            } catch {
              return {};
            }
          })()
        : resultJson;

    let resultUrls =
      parsedResult?.resultUrls ||
      parsedResult?.videoUrls ||
      info?.resultUrls ||
      info?.videoUrls ||
      [];

    if (!Array.isArray(resultUrls)) resultUrls = resultUrls ? [resultUrls] : [];

    const normalizedUrls = [];
    for (const url of resultUrls) {
      try {
        const download = await kieFetch('/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: url })
        });
        normalizedUrls.push(download?.data?.downloadUrl || download?.downloadUrl || url);
      } catch {
        normalizedUrls.push(url);
      }
    }

    res.json({
      status,
      done: ['success', 'succeed', 'completed'].includes(status),
      failed: ['fail', 'failed', 'error'].includes(status),
      failMsg: info?.failMsg || data?.msg || '',
      taskId,
      resultUrls: normalizedUrls
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/qwen2/create', async (req, res) => {
  try {
    const { model = 'qwen2/image-edit', input = {} } = req.body || {};
    if (!String(model || '').trim()) {
      return res.status(400).json({ error: 'model is required' });
    }
    if (String(input?.prompt || '').length > 2000)
      return res.status(400).json({ error: 'النص طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, String(model), {}))) return;

    const data = await kieFetch('/jobs/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input })
    });

    const taskId = data?.data?.taskId || data?.taskId || data?.data?.id || '';
    if (!taskId) {
      return res.status(502).json({ error: 'Kie did not return taskId' });
    }

    res.json({ taskId, ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie/qwen2/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.state || info?.status || info?.taskStatus || data?.status || '').toLowerCase();
    const resultJson = info?.resultJson || info?.result || {};
    const parsedResult =
      typeof resultJson === 'string'
        ? (() => {
            try {
              return JSON.parse(resultJson);
            } catch {
              return {};
            }
          })()
        : resultJson;

    let resultUrls =
      parsedResult?.resultUrls ||
      parsedResult?.imageUrls ||
      info?.resultUrls ||
      info?.imageUrls ||
      [];

    if (!Array.isArray(resultUrls)) resultUrls = resultUrls ? [resultUrls] : [];

    const normalizedUrls = [];
    for (const url of resultUrls) {
      try {
        const download = await kieFetch('/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: url })
        });
        normalizedUrls.push(download?.data?.downloadUrl || download?.downloadUrl || url);
      } catch {
        normalizedUrls.push(url);
      }
    }

    res.json({
      status,
      done: ['success', 'succeed', 'completed'].includes(status),
      failed: ['fail', 'failed', 'error'].includes(status),
      failMsg: info?.failMsg || data?.msg || '',
      taskId,
      resultUrls: normalizedUrls
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/ideogram/create', async (req, res) => {
  try {
    const { model = 'ideogram/v3-reframe', input = {} } = req.body || {};
    if (!String(model || '').trim()) {
      return res.status(400).json({ error: 'model is required' });
    }
    if (!String(input.prompt || '').trim()) {
      return res.status(400).json({ error: 'prompt is required' });
    }
    if (String(input.prompt || '').length > 2000)
      return res.status(400).json({ error: 'النص طويل جداً' });
    if (!String(input.image_url || '').trim()) {
      return res.status(400).json({ error: 'image_url is required' });
    }
    if (!String(input.image_size || '').trim()) {
      return res.status(400).json({ error: 'image_size is required' });
    }
    if (!(await deductCreditsForGeneration(req, res, String(model), {}))) return;

    const data = await kieFetch('/jobs/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input })
    });

    const taskId = data?.data?.taskId || data?.taskId || data?.data?.id || '';
    if (!taskId) {
      return res.status(502).json({ error: 'Kie did not return taskId' });
    }

    res.json({ taskId, ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie/ideogram/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.state || info?.status || info?.taskStatus || data?.status || '').toLowerCase();
    const resultJson = info?.resultJson || info?.result || {};
    const parsedResult =
      typeof resultJson === 'string'
        ? (() => {
            try {
              return JSON.parse(resultJson);
            } catch {
              return {};
            }
          })()
        : resultJson;

    let resultUrls =
      parsedResult?.resultUrls ||
      parsedResult?.imageUrls ||
      info?.resultUrls ||
      info?.imageUrls ||
      [];

    if (!Array.isArray(resultUrls)) resultUrls = resultUrls ? [resultUrls] : [];

    const normalizedUrls = [];
    for (const url of resultUrls) {
      try {
        const download = await kieFetch('/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: url })
        });
        normalizedUrls.push(download?.data?.downloadUrl || download?.downloadUrl || url);
      } catch {
        normalizedUrls.push(url);
      }
    }

    res.json({
      status,
      done: ['success', 'succeed', 'completed'].includes(status),
      failed: ['fail', 'failed', 'error'].includes(status),
      failMsg: info?.failMsg || data?.msg || '',
      taskId,
      resultUrls: normalizedUrls
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/zimage/create', async (req, res) => {
  try {
    const { model = 'z-image', input = {} } = req.body || {};
    if (!String(model || '').trim()) {
      return res.status(400).json({ error: 'model is required' });
    }
    if (String(input?.prompt || '').length > 2000)
      return res.status(400).json({ error: 'النص طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, String(model), {}))) return;

    const data = await kieFetch('/jobs/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input })
    });

    const taskId = data?.data?.taskId || data?.taskId || data?.data?.id || '';
    if (!taskId) {
      return res.status(502).json({ error: 'Kie did not return taskId' });
    }

    res.json({ taskId, ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie/zimage/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.state || info?.status || info?.taskStatus || data?.status || '').toLowerCase();
    const resultJson = info?.resultJson || info?.result || {};
    const parsedResult =
      typeof resultJson === 'string'
        ? (() => {
            try {
              return JSON.parse(resultJson);
            } catch {
              return {};
            }
          })()
        : resultJson;

    let resultUrls =
      parsedResult?.resultUrls ||
      parsedResult?.imageUrls ||
      info?.resultUrls ||
      info?.imageUrls ||
      [];

    if (!Array.isArray(resultUrls)) resultUrls = resultUrls ? [resultUrls] : [];

    const normalizedUrls = [];
    for (const url of resultUrls) {
      try {
        const download = await kieFetch('/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: url })
        });
        normalizedUrls.push(download?.data?.downloadUrl || download?.downloadUrl || url);
      } catch {
        normalizedUrls.push(url);
      }
    }

    res.json({
      status,
      done: ['success', 'succeed', 'completed'].includes(status),
      failed: ['fail', 'failed', 'error'].includes(status),
      failMsg: info?.failMsg || data?.msg || '',
      taskId,
      resultUrls: normalizedUrls
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/seedream/create', async (req, res) => {
  try {
    const { model = 'seedream/4.5-text-to-image', input = {} } = req.body || {};
    if (!String(model || '').trim()) {
      return res.status(400).json({ error: 'model is required' });
    }
    if (String(input?.prompt || '').length > 2000)
      return res.status(400).json({ error: 'النص طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, String(model), {}))) return;

    const data = await kieFetch('/jobs/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input })
    });

    const taskId = data?.data?.taskId || data?.taskId || data?.data?.id || '';
    if (!taskId) {
      return res.status(502).json({ error: 'Kie did not return taskId' });
    }

    res.json({ taskId, ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie/seedream/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.state || info?.status || info?.taskStatus || data?.status || '').toLowerCase();
    const resultJson = info?.resultJson || info?.result || {};
    const parsedResult =
      typeof resultJson === 'string'
        ? (() => {
            try {
              return JSON.parse(resultJson);
            } catch {
              return {};
            }
          })()
        : resultJson;

    let resultUrls =
      parsedResult?.resultUrls ||
      parsedResult?.imageUrls ||
      info?.resultUrls ||
      info?.imageUrls ||
      [];

    if (!Array.isArray(resultUrls)) resultUrls = resultUrls ? [resultUrls] : [];

    const normalizedUrls = [];
    for (const url of resultUrls) {
      try {
        const download = await kieFetch('/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: url })
        });
        normalizedUrls.push(download?.data?.downloadUrl || download?.downloadUrl || url);
      } catch {
        normalizedUrls.push(url);
      }
    }

    res.json({
      status,
      done: ['success', 'succeed', 'completed'].includes(status),
      failed: ['fail', 'failed', 'error'].includes(status),
      failMsg: info?.failMsg || data?.msg || '',
      taskId,
      resultUrls: normalizedUrls
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/seedance/create', async (req, res) => {
  try {
    const { model = 'bytedance/seedance-1.5-pro', input = {} } = req.body || {};
    if (!String(model || '').trim()) {
      return res.status(400).json({ error: 'model is required' });
    }
    if (!checkPlanAccess(req, res, model)) return;
    if (String(input?.prompt || '').length > 2000)
      return res.status(400).json({ error: 'النص طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, String(model), { duration: Number(input?.duration||5), resolution: String(input?.resolution||'720p') }))) return;

    const data = await kieFetch('/jobs/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input })
    });

    const taskId = data?.data?.taskId || data?.taskId || data?.data?.id || '';
    if (!taskId) {
      return res.status(502).json({ error: 'Kie did not return taskId' });
    }

    res.json({ taskId, ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie/seedance/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.state || info?.status || info?.taskStatus || data?.status || '').toLowerCase();
    const resultJson = info?.resultJson || info?.result || {};
    const parsedResult =
      typeof resultJson === 'string'
        ? (() => {
            try {
              return JSON.parse(resultJson);
            } catch {
              return {};
            }
          })()
        : resultJson;

    let resultUrls =
      parsedResult?.resultUrls ||
      parsedResult?.videoUrls ||
      info?.resultUrls ||
      info?.videoUrls ||
      [];

    if (!Array.isArray(resultUrls)) resultUrls = resultUrls ? [resultUrls] : [];

    const normalizedUrls = [];
    for (const url of resultUrls) {
      try {
        const download = await kieFetch('/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: url })
        });
        normalizedUrls.push(download?.data?.downloadUrl || download?.downloadUrl || url);
      } catch {
        normalizedUrls.push(url);
      }
    }

    res.json({
      status,
      done: ['success', 'succeed', 'completed'].includes(status),
      failed: ['fail', 'failed', 'error'].includes(status),
      failMsg: info?.failMsg || data?.msg || '',
      taskId,
      resultUrls: normalizedUrls
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/wan/create', async (req, res) => {
  try {
    const { model = 'wan/2-6-text-to-video', input = {} } = req.body || {};
    if (!String(model || '').trim()) {
      return res.status(400).json({ error: 'model is required' });
    }
    if (!checkPlanAccess(req, res, model)) return;
    if (String(input?.prompt || '').length > 2000)
      return res.status(400).json({ error: 'النص طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, String(model), { duration: Number(input?.duration||5), resolution: String(input?.resolution||'720p') }))) return;

    const data = await kieFetch('/jobs/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input })
    });

    const taskId = data?.data?.taskId || data?.taskId || data?.data?.id || '';
    if (!taskId) {
      return res.status(502).json({ error: 'Kie did not return taskId' });
    }

    res.json({ taskId, ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie/wan/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.state || info?.status || info?.taskStatus || data?.status || '').toLowerCase();
    const resultJson = info?.resultJson || info?.result || {};
    const parsedResult =
      typeof resultJson === 'string'
        ? (() => {
            try {
              return JSON.parse(resultJson);
            } catch {
              return {};
            }
          })()
        : resultJson;

    let resultUrls =
      parsedResult?.resultUrls ||
      parsedResult?.videoUrls ||
      info?.resultUrls ||
      info?.videoUrls ||
      [];

    if (!Array.isArray(resultUrls)) resultUrls = resultUrls ? [resultUrls] : [];

    const normalizedUrls = [];
    for (const url of resultUrls) {
      try {
        const download = await kieFetch('/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: url })
        });
        normalizedUrls.push(download?.data?.downloadUrl || download?.downloadUrl || url);
      } catch {
        normalizedUrls.push(url);
      }
    }

    res.json({
      status,
      done: ['success', 'succeed', 'completed'].includes(status),
      failed: ['fail', 'failed', 'error'].includes(status),
      failMsg: info?.failMsg || data?.msg || '',
      taskId,
      resultUrls: normalizedUrls
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/flux2/create', async (req, res) => {
  try {
    const { model = 'flux-2/pro-image-to-image', input = {} } = req.body || {};
    if (!String(model || '').trim()) {
      return res.status(400).json({ error: 'model is required' });
    }
    if (String(input?.prompt || '').length > 2000)
      return res.status(400).json({ error: 'النص طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, String(model), {}))) return;

    const data = await kieFetch('/jobs/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input })
    });

    const taskId = data?.data?.taskId || data?.taskId || data?.data?.id || '';
    if (!taskId) {
      return res.status(502).json({ error: 'Kie did not return taskId' });
    }

    res.json({ taskId, ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie/flux2/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.state || info?.status || info?.taskStatus || data?.status || '').toLowerCase();
    const resultJson = info?.resultJson || info?.result || {};
    const parsedResult =
      typeof resultJson === 'string'
        ? (() => {
            try {
              return JSON.parse(resultJson);
            } catch {
              return {};
            }
          })()
        : resultJson;

    let resultUrls =
      parsedResult?.resultUrls ||
      parsedResult?.imageUrls ||
      info?.resultUrls ||
      info?.imageUrls ||
      [];

    if (!Array.isArray(resultUrls)) resultUrls = resultUrls ? [resultUrls] : [];

    const normalizedUrls = [];
    for (const url of resultUrls) {
      try {
        const download = await kieFetch('/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: url })
        });
        normalizedUrls.push(download?.data?.downloadUrl || download?.downloadUrl || url);
      } catch {
        normalizedUrls.push(url);
      }
    }

    res.json({
      status,
      done: ['success', 'succeed', 'completed'].includes(status),
      failed: ['fail', 'failed', 'error'].includes(status),
      failMsg: info?.failMsg || data?.msg || '',
      taskId,
      resultUrls: normalizedUrls
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.post('/api/kie/flux-kontext/create', async (req, res) => {
  try {
    const payload = req.body || {};
    if (!String(payload.prompt || '').trim()) {
      return res.status(400).json({ error: 'prompt is required' });
    }
    if (String(payload.prompt || '').length > 2000)
      return res.status(400).json({ error: 'النص طويل جداً' });
    if (!(await deductCreditsForGeneration(req, res, 'flux-kontext', {}))) return;

    const data = await kieFetch('/flux/kontext/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const taskId = data?.data?.taskId || data?.taskId || data?.data?.id || '';
    if (!taskId) {
      return res.status(502).json({ error: 'Kie did not return taskId' });
    }

    res.json({ taskId, ...(req.creditInfo || {}) });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

app.get('/api/kie/flux-kontext/status', async (req, res) => {
  try {
    const taskId = String(req.query.taskId || '');
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const data = await kieFetch(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    const info = data?.data || data?.result || {};
    const status = String(info?.state || info?.status || info?.taskStatus || data?.status || '').toLowerCase();
    const resultJson = info?.resultJson || info?.result || {};
    const parsedResult =
      typeof resultJson === 'string'
        ? (() => {
            try {
              return JSON.parse(resultJson);
            } catch {
              return {};
            }
          })()
        : resultJson;

    let resultUrls =
      parsedResult?.resultUrls ||
      parsedResult?.resultImageUrl ||
      parsedResult?.imageUrls ||
      info?.resultUrls ||
      info?.resultImageUrl ||
      info?.imageUrls ||
      [];

    if (!Array.isArray(resultUrls)) resultUrls = resultUrls ? [resultUrls] : [];

    const normalizedUrls = [];
    for (const url of resultUrls) {
      try {
        const download = await kieFetch('/files/download-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: url })
        });
        normalizedUrls.push(download?.data?.downloadUrl || download?.downloadUrl || url);
      } catch {
        normalizedUrls.push(url);
      }
    }

    res.json({
      status,
      done: ['success', 'succeed', 'completed'].includes(status),
      failed: ['fail', 'failed', 'error'].includes(status),
      failMsg: info?.failMsg || data?.msg || '',
      taskId,
      resultUrls: normalizedUrls
    });
  } catch (e) {
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

const VAULT_DIR = path.join(__dirname, 'vault');
if(!fs.existsSync(VAULT_DIR)) fs.mkdirSync(VAULT_DIR, {recursive:true});

// ─── SECURITY AUDIT LOG ─────────────────────────────────────────────────────
function auditLog(action, detail, req) {
  try {
    const entry = JSON.stringify({
      action,
      detail: detail || null,
      ip: req && (req.ip || (req.connection && req.connection.remoteAddress)) || 'unknown',
      ts: new Date().toISOString()
    }) + '\n';
    fs.appendFileSync(path.join(VAULT_DIR, 'security.log'), entry);
  } catch {}
}

// ─── FILE UPLOAD VALIDATION ─────────────────────────────────────────────────
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg','image/png','image/gif','image/webp','image/avif']); // SVG removed — XSS risk
const ALLOWED_MEDIA_MIMES = new Set([
  ...ALLOWED_IMAGE_MIMES,
  'video/mp4','video/webm','video/quicktime',
  'audio/mpeg','audio/wav','audio/ogg','audio/mp4','audio/webm'
]);
const ALLOWED_MEDIA_EXTS = new Set([
  '.jpg','.jpeg','.png','.gif','.webp','.avif','.svg',
  '.mp4','.webm','.mov',
  '.mp3','.wav','.ogg','.m4a'
]);
const ALLOWED_ASSET_MIMES = new Set([
  ...ALLOWED_IMAGE_MIMES,
  'image/x-icon','image/vnd.microsoft.icon',
  'application/json','text/css','text/javascript','application/javascript'
]);

function isAllowedUpload(file, allowedMimes) {
  if (!file) return false;
  const ext = path.extname(file.originalname || '').toLowerCase();
  return allowedMimes.has(file.mimetype) && ALLOWED_MEDIA_EXTS.has(ext);
}

// â•â•â• USER AUTH SYSTEM â•â•â•
const USAGE_FILE     = path.join(VAULT_DIR, 'usage.json');
const ACTIVITY_FILE  = path.join(VAULT_DIR, 'activity.json');
const GENERATIONS_FILE = path.join(VAULT_DIR, 'generations.json');
const HOMEPAGE_FILE  = path.join(VAULT_DIR, 'homepage.json');
const PLANS = {
  starter: { price: 0,  credits: 0,    nanoBananaFree: true, label: 'Starter (مجاني)' },
  pro:     { price: 25, credits: 0,    nanoBananaFree: true,  label: 'Pro'     },
  creator: { price: 50, credits: 0,    nanoBananaFree: true,  label: 'Creator' }
};

// â•â•â• PLAN-BASED ACCESS CONTROL â•â•â•
const PLAN_TIER = { starter: 0, pro: 1, creator: 2 };

function modelRequiredTier(modelName, generationMode) {
  return 0; // الكل مفتوح — الكريدت هو الحد الوحيد
}

// الوصول مفتوح لكل الخطط — الكريدت هو المتحكم الوحيد
function checkPlanAccess(req, res, modelName, generationMode) {
  return true;
}

// â”€â”€â”€ Secure password hashing (PBKDF2 with per-user salt, v2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Timing-safe string comparison via HMAC (kept for CSRF validation)
function timingSafeEqual(a, b) {
  const key = Buffer.alloc(32);
  const hA  = crypto.createHmac('sha256', key).update(String(a)).digest();
  const hB  = crypto.createHmac('sha256', key).update(String(b)).digest();
  return crypto.timingSafeEqual(hA, hB);
}
// â”€â”€â”€ Server-side credit cost calculator (mirrors frontend calcCreditCost) â”€â”€â”€â”€
function serverCalcCreditCost(model, params = {}) {
  const m     = String(model   || '').toLowerCase();
  const dur   = Number(params.duration   || 5);
  const res   = String(params.resolution || '720p').toLowerCase();
  const gmode = String(params.mode       || 'std').toLowerCase();
  const audio = params.audio === true || params.audio === 'true';

  if (m === 'kling-3.0/video') {
    const isPro = gmode === 'pro';
    const rps   = isPro ? (audio ? 27 : 18) : (audio ? 20 : 14);
    return Math.ceil(dur * rps);
  }
  if (m === 'kling-2.6/image-to-video')
    return Math.ceil(dur * (audio ? 22 : 11));
  if (m === 'kling/v2-5-turbo-image-to-video-pro') {
    const isPro = gmode === 'pro';
    const rps   = isPro ? (audio ? 27 : 18) : (audio ? 20 : 14);
    return Math.ceil(dur * rps);
  }
  if (m === 'kling-3.0/motion-control')
    return Math.ceil(dur * (res.includes('1080') ? 27 : 18));
  if (m.includes('hailuo/02') || m.includes('hailuo/0.2')) {
    const isPro = m.includes('pro');
    const is10s = dur >= 9;
    return isPro ? (is10s ? 114 : 57) : (is10s ? 76 : 38);
  }
  if (m.includes('hailuo')) {
    const isPro  = m.includes('pro');
    const is1080 = res.includes('1080');
    const is10s  = dur >= 9;
    if (isPro) { if (is10s) return 90; if (is1080) return 80; return 45; }
    else        { return (is10s || is1080) ? 50 : 30; }
  }
  if (m.includes('sora')) {
    if (m.includes('watermark')) return 5;
    if (m.includes('characters')) return 30;
    const frames = Number(params.frames || params.n_frames || 10);
    return frames >= 14 ? 35 : 30;
  }
  if (m.startsWith('wan/2-6') || m.startsWith('wan/2-2')) {
    if (m.includes('wan/2-2')) return 48;
    const is1080 = res.includes('1080');
    if (dur >= 14) return is1080 ? 315 : 210;
    if (dur >=  9) return is1080 ? 210 : 140;
    return is1080 ? 105 : 70;
  }
  if (m.includes('seedance') || m.includes('bytedance')) {
    const isPro  = m.includes('pro') || m.includes('1.5');
    const is1080 = res.includes('1080');
    const is480  = res.includes('480');
    const rps    = isPro ? (is1080 ? 14 : is480 ? 2.8 : 6) : (is1080 ? 10 : is480 ? 2 : 4.5);
    return Math.ceil(dur * rps);
  }
  if (m.includes('qwen2') || m.includes('qwen/image'))     return 6;
  if (m.includes('seedream'))                               return 7;
  if (m.includes('ideogram'))                               return 7;
  if (m.includes('flux-kontext') || m.includes('fluxkontext')) return 7;
  if (m.includes('flex'))                                    return 24;  // flux-2/flex real: 24 KIE credits
  if (m.includes('flux-2') || m.includes('flux2'))          return 7;
  if (m.includes('zimage') || m.includes('z-image') || m === 'z-image') return 1;
  if (m.includes('recraft'))                                return 1;
  if (m.includes('topaz'))                                  return 10;
  if (m.includes('infinitalk'))                             return 15;
  if (m.includes('grok-imagine') || m.includes('grok/imagine')) return 4;
  if (m.includes('grok'))                                   return 4;
  // nano banana — أسعار ثابتة نهائية (بدون هامش ربح) — تُستخدم مباشرة من deductCreditsForGeneration
  if (m.includes('gemini-3.1-flash-image') || m.includes('gemini-3-pro-image')) {
    const nk = String(params.nanoKey || '').toLowerCase();
    if (m.includes('gemini-3-pro-image')) return 5;  // nanopro = 5 كريدت (دائماً)
    if (nk === 'nano') return 2;                     // nano    = 2 كريدت
    return 10;                                        // nano2   = 10 كريدت
  }
  if (m.includes('gpt-5') || m.includes('gpt5') || m.includes('gpt-4') || m.includes('gpt4') || m.includes('gemini')) return 1;
  if (m.includes('ai-avatar'))                              return 50;
  if (m === 'suno' || m.startsWith('suno/')) {
    const v = String(params.sunoModel || 'V5').toUpperCase();
    return (v === 'V3' || v === 'V3.5') ? 8 : 10;
  }
  if (m.includes('elevenlabs')) {
    const tlen = Number(params.textLength || 0);
    return Math.max(1, Math.ceil(tlen / 4));
  }
  if (m.includes('veo'))                                    return 50;
  if (m.includes('runway')) {
    const is1080 = String(params.resolution || params.quality || '720p').includes('1080');
    const dur    = Number(params.duration || 5);
    return is1080 ? 20 : (dur >= 9 ? 20 : 10);
  }
  if (m.includes('aleph'))                                  return 15;
  return 20; // safe default
}

// تطبيق هامش الربح الديناميكي فوق تكلفة KIE
function applyProfitMargin(baseCost) {
  if (!PROFIT_MARGIN || PROFIT_MARGIN <= 0) return baseCost;
  return Math.ceil(baseCost * (1 + PROFIT_MARGIN));
}
// Returns true if the user has an active subscription (subscriptionEndDate exists and is in the future).
function isSubscriptionActive(user) {
  if (!user) return false;
  if (!user.subscriptionEndDate) return false;
  return new Date().toISOString() <= user.subscriptionEndDate;
}

// ═══ USER DATA HELPERS ═══════════════════════════════════════════════════════
// Supabase is primary when configured; vault/users.json is local fallback.
const USERS_FILE = path.join(VAULT_DIR, 'users.json');

function getVaultUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')).users || []; }
  catch { return []; }
}
function saveVaultUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
}
function getVaultUser(userId) {
  return getVaultUsers().find(u => u.id === userId) || null;
}
function updateVaultUser(userId, changes) {
  const users = getVaultUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx < 0) return null;
  Object.assign(users[idx], changes);
  saveVaultUsers(users);
  return users[idx];
}

/**
 * Load a user profile by ID. Supabase first, vault fallback.
 */
async function getProfile(userId) {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) return data;
  }
  const vu = getVaultUser(userId);
  if (!vu) return null;
  return {
    id: vu.id, email: vu.email, credits: vu.credits, plan: vu.plan || 'starter',
    max_credits: vu.maxCredits || 0, is_admin: vu.isAdmin || false,
    nano_banana_free: vu.nanoBananaFree !== false,
    renew_date: vu.renewDate || null,
    subscription_start_date: vu.subscriptionStartDate || null,
    subscription_end_date: vu.subscriptionEndDate || null,
    created_at: vu.createdAt || null, pending_plan: vu.pendingPlan || null
  };
}

/**
 * Update fields on a profile. Supabase first, vault fallback.
 */
async function updateProfile(userId, changes) {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) console.error('[updateProfile] Supabase error:', error.message, '| userId:', userId, '| fields:', Object.keys(changes).join(','));
    if (!error && data) return data;
  }
  // Map Supabase column names to vault field names
  const vaultMap = {};
  if ('credits' in changes) vaultMap.credits = changes.credits;
  if ('plan' in changes) vaultMap.plan = changes.plan;
  if ('max_credits' in changes) vaultMap.maxCredits = changes.max_credits;
  if ('nano_banana_free' in changes) vaultMap.nanoBananaFree = changes.nano_banana_free;
  if ('renew_date' in changes) vaultMap.renewDate = changes.renew_date;
  if ('subscription_start_date' in changes) vaultMap.subscriptionStartDate = changes.subscription_start_date;
  if ('subscription_end_date' in changes) vaultMap.subscriptionEndDate = changes.subscription_end_date;
  if ('pending_plan' in changes) vaultMap.pendingPlan = changes.pending_plan;
  const updated = updateVaultUser(userId, vaultMap);
  if (!updated) return null;
  return {
    id: updated.id, email: updated.email, credits: updated.credits,
    plan: updated.plan, max_credits: updated.maxCredits,
    is_admin: updated.isAdmin, nano_banana_free: updated.nanoBananaFree
  };
}

/**
 * Middleware: extract Supabase access_token from cookie or Authorization header,
 * verify it with supabaseAdmin.auth.getUser(), load profile, attach to req.
 *
 * Sets: req.user (Supabase auth user), req.profile (public.profiles row),
 *       req.currentUser (alias for req.profile — backward compat for existing code)
 */
async function attachUser(req, res, next) {
  req.user = null;
  req.profile = null;
  req.currentUser = null;

  // 1. Extract token — prefer HttpOnly cookie, fall back to header
  const cookieToken = req.cookies && req.cookies.sb_access_token;
  const headerAuth = req.headers['authorization'] || '';
  const token = cookieToken || (headerAuth.startsWith('Bearer ') ? headerAuth.slice(7) : '') || '';

  if (!token || !supabaseAdmin) return next();

  try {
    // 2. Verify token with Supabase Auth (server-side, service role)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return next();

    // 3. Load profile from public.profiles
    let profile = await getProfile(user.id);

    // 4. Auto-create profile if missing (edge case: trigger didn't fire)
    if (!profile) {
      // Read free trial credits from vault settings (set via admin dashboard)
      let initialCredits = 100;
      try {
        const ftPath = path.join(__dirname, 'vault', 'free_trial.json');
        const ft = JSON.parse(fs.readFileSync(ftPath, 'utf8'));
        if (typeof ft.freeCredits === 'number' && ft.freeCredits >= 0) initialCredits = ft.freeCredits;
      } catch {}
      const { data: newP } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          credits: initialCredits,
          is_admin: false
        })
        .select()
        .single();
      profile = newP;
    }

    if (!profile) return next();

    // 5. Map profile fields to the shape existing code expects
    req.user = user;                            // Supabase auth user
    req.profile = profile;                      // raw profile row
    req.currentUser = {                         // backward-compat shape
      id:                    profile.id,
      email:                 profile.email,
      credits:               profile.credits        ?? 0,
      plan:                  profile.plan            || 'starter',
      maxCredits:            profile.max_credits     ?? 0,
      isAdmin:               profile.is_admin        === true,
      nanoBananaFree:        profile.nano_banana_free !== false,
      renewDate:             profile.renew_date      || null,
      subscriptionStartDate: profile.subscription_start_date || null,
      subscriptionEndDate:   profile.subscription_end_date   || null,
      pendingPlan:           profile.pending_plan    || null,
      createdAt:             profile.created_at,
    };
  } catch (err) {
    console.error('[attachUser]', err.message);
  }
  next();
}

/**
 * Middleware: require authenticated user or 401.
 */
function requireSignedIn(req, res, next) {
  if (!req.currentUser) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      auditLog('auth.rejected', 'path="' + (req.path || '').slice(0, 100) + '"', req);
    }
    return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }
  next();
}

/**
 * Async credit deduction — reads from Supabase, deducts, writes back.
 * Returns true on success (sets req.creditInfo), false on failure (sends HTTP error).
 */
async function deductCreditsForGeneration(req, res, model, params) {
  if (!req.currentUser) {
    res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الميزة' });
    return false;
  }
  // Subscription check
  const isStarter = (req.currentUser.plan || 'starter') === 'starter';
  if (!isStarter && !isSubscriptionActive(req.currentUser)) {
    res.status(403).json({ error: 'الاشتراك منتهي — يرجى تجديد الخطة', code: 'subscription_expired' });
    return false;
  }

  // أسعار Nano Banana الثابتة (بدون هامش ربح) — طبقة حماية إضافية عبر nanoKey
  const NANO_FLAT = { nano: 2, nano2: 10, nanopro: 5 };
  const nkParam = String(params.nanoKey || '').toLowerCase();
  // إذا كان nanoKey محدداً — نستخدم السعر الثابت مباشرة
  // وإلا نستخدم serverCalcCreditCost التي ترجع السعر الصحيح أيضاً (applyProfitMargin لا تؤثر على نانو)
  const rawCost = nkParam in NANO_FLAT
    ? NANO_FLAT[nkParam]
    : serverCalcCreditCost(model, params);
  // لمنع تضاعف الهامش على نانو: serverCalcCreditCost ترجع السعر النهائي بالفعل
  const isNanoModel = String(model || '').toLowerCase().includes('gemini-3');
  const cost = (isNanoModel || nkParam in NANO_FLAT) ? rawCost : applyProfitMargin(rawCost);

  // Usage limits check (still vault-based for now)
  const limCheck = checkUsageLimits(req.currentUser, model, cost);
  if (limCheck.exceeded) {
    res.status(429).json({ error: `تجاوزت الحد المسموح لك (الحد الـ${limCheck.period === 'daily' ? 'يومي' : 'شهري'} لـ${limCheck.field}: ${limCheck.limit})`, code: 'limit_exceeded' });
    return false;
  }
  // Re-read current credits from Supabase to prevent race conditions
  const freshProfile = await getProfile(req.currentUser.id);
  const current = freshProfile?.credits ?? 0;
  if (current < cost) {
    res.status(402).json({ error: 'رصيد غير كافٍ', credits: current, required: cost });
    return false;
  }
  // Atomic decrement via Supabase RPC or update
  const updated = await updateProfile(req.currentUser.id, { credits: current - cost });
  if (updated) {
    req.currentUser.credits = updated.credits;
    req.profile = updated;
  }
  req.creditInfo = { creditsUsed: cost, remainingCredits: updated?.credits ?? (current - cost) };
  // Track usage (still vault-based)
  trackUsage(req.currentUser.id, model, cost);
  // Log individual activity event for admin feed
  const _prompt = String(
    req.body?.prompt || req.body?.input?.prompt || req.body?.input?.content ||
    req.body?.text   || req.body?.lyrics       || req.body?.description    || ''
  ).trim().slice(0, 150);
  logActivity(req.currentUser.id, req.currentUser.email, inferUsageType(model), model, cost, _prompt);
  return true;
}

function genToken() { return crypto.randomBytes(32).toString('hex'); }
// ═══ END SUPABASE AUTH HELPERS ═══════════════════════════════════════════════




// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────
function logActivity(userId, email, type, model, credits, prompt) {
  try {
    let log = [];
    try { log = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf8')); } catch {}
    if (!Array.isArray(log)) log = [];
    const id = crypto.randomBytes(8).toString('hex');
    log.unshift({
      id,
      userId  : String(userId  || ''),
      email   : String(email   || ''),
      type    : String(type    || 'task'),
      model   : String(model   || ''),
      credits : Number(credits) || 0,
      prompt  : String(prompt  || '').slice(0, 150),
      imageUrl: '',
      createdAt: new Date().toISOString()
    });
    if (log.length > 2000) log = log.slice(0, 2000);
    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(log));
    return id;
  } catch (_) { return ''; }
}

// Attach an image URL to the most-recent activity entry for this user
// (called from /api/store-image after the file is saved on disk)
function attachActivityImage(userId, imageUrl) {
  try {
    let log = [];
    try { log = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf8')); } catch {}
    if (!Array.isArray(log)) return;
    const cutoff = Date.now() - 5 * 60 * 1000; // within last 5 minutes
    const idx = log.findIndex(e =>
      e.userId === String(userId) &&
      !e.imageUrl &&
      new Date(e.createdAt).getTime() > cutoff
    );
    if (idx === -1) return;
    log[idx].imageUrl = String(imageUrl);
    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(log));
  } catch (_) {}
}

// ─── GENERATIONS LOG (admin media viewer) ─────────────────────────────────────
function loadGenerations() {
  try { const d = JSON.parse(fs.readFileSync(GENERATIONS_FILE, 'utf8')); return Array.isArray(d) ? d : []; }
  catch { return []; }
}
function saveGenerations(arr) {
  fs.writeFileSync(GENERATIONS_FILE, JSON.stringify(arr));
}
function logGeneration(userId, email, url, isVideo, model, prompt, credits = 0) {
  try {
    const log = loadGenerations();
    log.unshift({
      id: crypto.randomBytes(8).toString('hex'),
      userId: String(userId || ''),
      email: String(email || ''),
      url: String(url || ''),
      isVideo: !!isVideo,
      model: String(model || ''),
      prompt: String(prompt || '').slice(0, 200),
      credits: Number(credits) || 0,
      createdAt: new Date().toISOString()
    });
    if (log.length > 5000) log.length = 5000;
    saveGenerations(log);
  } catch (_) {}
}

// ─── USAGE TRACKING ──────────────────────────────────────────────────────────
// Default per-user daily/monthly limits (null = no limit; admin can set per-user overrides)
const DEFAULT_LIMITS = {
  daily:   { credits: null, images: null, videos: null },
  monthly: { credits: null, images: null, videos: null }
};

function loadUsage()  { try { return JSON.parse(fs.readFileSync(USAGE_FILE,'utf8')); } catch { return {}; } }
function saveUsage(d) { fs.writeFileSync(USAGE_FILE, JSON.stringify(d)); }

function inferUsageType(model) {
  const m = String(model || '').toLowerCase();
  if (m.includes('video') || m.includes('kling') || m.includes('hailuo') ||
      m.includes('wan') || m.includes('seedance') || m.includes('sora') ||
      m.includes('grok') || m.includes('infinitalk') || m.includes('veo')) return 'video';
  if (m.includes('image') || m.includes('ideogram') || m.includes('zimage') ||
      m.includes('seedream') || m.includes('flux') || m.includes('qwen') ||
      m.includes('gpt') || m.includes('suno') || m.includes('elevenlabs') ||
      m.includes('gemini')) return 'image';
  return 'task';
}

function trackUsage(userId, model, credits) {
  try {
    const type   = inferUsageType(model);
    const today  = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const month  = today.slice(0, 7);                      // YYYY-MM
    const d      = loadUsage();
    if (!d[userId])        d[userId]       = {};
    if (!d[userId][today]) d[userId][today] = { images: 0, videos: 0, tasks: 0, credits: 0 };
    if (!d[userId][month]) d[userId][month] = { images: 0, videos: 0, tasks: 0, credits: 0 };
    const c = Number(credits) || 0;
    for (const bucket of [d[userId][today], d[userId][month]]) {
      if (type === 'video') bucket.videos++;
      else if (type === 'image') bucket.images++;
      else bucket.tasks++;
      bucket.credits += c;
    }
    saveUsage(d);
  } catch (_) {}
}

function getUserUsageData(userId) {
  const raw   = loadUsage();
  const u     = raw[userId] || {};
  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);
  // Aggregate all-time from monthly keys
  let allTime = { images: 0, videos: 0, tasks: 0, credits: 0 };
  let mostUsedCounts = {};
  for (const [key, val] of Object.entries(u)) {
    if (/^\d{4}-\d{2}$/.test(key)) {
      allTime.images  += val.images  || 0;
      allTime.videos  += val.videos  || 0;
      allTime.tasks   += val.tasks   || 0;
      allTime.credits += val.credits || 0;
    }
  }
  // Recent 30 daily entries for activity chart
  const dailyKeys = Object.keys(u).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().slice(-30);
  const recentDays = dailyKeys.map(k => ({ date: k, ...u[k] }));
  return {
    today:    u[today]  || { images: 0, videos: 0, tasks: 0, credits: 0 },
    month:    u[month]  || { images: 0, videos: 0, tasks: 0, credits: 0 },
    allTime,
    recentDays
  };
}

function checkUsageLimits(user, model, cost) {
  // Check per-user overrides first, then plan defaults
  const limits = {
    daily:   { ...(DEFAULT_LIMITS.daily),   ...(user.dailyLimits   || {}) },
    monthly: { ...(DEFAULT_LIMITS.monthly), ...(user.monthlyLimits || {}) }
  };
  const today = new Date().toISOString().split('T')[0];
  const month = today.slice(0, 7);
  const raw   = loadUsage();
  const u     = raw[user.id] || {};
  const day   = u[today]  || { images: 0, videos: 0, tasks: 0, credits: 0 };
  const mon   = u[month]  || { images: 0, videos: 0, tasks: 0, credits: 0 };
  const type  = inferUsageType(model);

  // Daily credit limit
  if (limits.daily.credits !== null && (day.credits + cost) > limits.daily.credits)
    return { exceeded: true, period: 'daily',   field: 'credits', limit: limits.daily.credits   };
  // Monthly credit limit
  if (limits.monthly.credits !== null && (mon.credits + cost) > limits.monthly.credits)
    return { exceeded: true, period: 'monthly', field: 'credits', limit: limits.monthly.credits };
  // Daily image limit
  if (type === 'image' && limits.daily.images !== null && day.images >= limits.daily.images)
    return { exceeded: true, period: 'daily',   field: 'images',  limit: limits.daily.images    };
  // Monthly image limit
  if (type === 'image' && limits.monthly.images !== null && mon.images >= limits.monthly.images)
    return { exceeded: true, period: 'monthly', field: 'images',  limit: limits.monthly.images  };
  // Daily video limit
  if (type === 'video' && limits.daily.videos !== null && day.videos >= limits.daily.videos)
    return { exceeded: true, period: 'daily',   field: 'videos',  limit: limits.daily.videos    };
  // Monthly video limit
  if (type === 'video' && limits.monthly.videos !== null && mon.videos >= limits.monthly.videos)
    return { exceeded: true, period: 'monthly', field: 'videos',  limit: limits.monthly.videos  };

  return { exceeded: false };
}
// ─── END USAGE TRACKING ───────────────────────────────────────────────────────



// POST /api/auth/register — Supabase Auth sign-up + profile creation
app.post('/api/auth/register', loginLimiter, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Auth service not configured' });
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });
    if (String(email).length > 254) return res.status(400).json({ error: 'البريد الإلكتروني طويل جداً' });
    if (String(password).length < 8) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    if (String(password).length > 128) return res.status(400).json({ error: 'كلمة المرور طويلة جداً' });
    if (!String(email).match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return res.status(400).json({ error: 'البريد الإلكتروني غير صالح' });

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true  // auto-confirm for now
    });
    if (authError) {
      if (authError.message.includes('already been registered') || authError.message.includes('duplicate'))
        return res.status(409).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
      return res.status(400).json({ error: authError.message });
    }

    // Sign in to get session tokens
    const { data: session, error: signInErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink', email: email.toLowerCase().trim()
    });
    // Generate real session (use anon client for user-facing auth)
    const { data: signInData, error: loginErr } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(), password
    });

    if (loginErr || !signInData?.session) {
      // User created but auto-login failed — still return success
      auditLog('user.register', 'email="' + email + '" plan="starter" credits=100 (auto-login failed)', req);
      return res.status(201).json({ ok: true, message: 'تم إنشاء الحساب، يرجى تسجيل الدخول' });
    }

    // Load the profile (auto-created by trigger)
    const profile = await getProfile(authData.user.id);
    const safeUser = {
      id: authData.user.id,
      email: authData.user.email,
      credits: profile?.credits ?? 100,
      plan: profile?.plan || 'starter',
      maxCredits: profile?.max_credits ?? 0,
      isAdmin: profile?.is_admin === true,
      nanoBananaFree: true,
      role: 'user',
      createdAt: authData.user.created_at,
    };

    // Set HttpOnly cookies
    const sess = signInData.session;
    res.cookie('sb_access_token', sess.access_token, {
      httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: sess.expires_in * 1000
    });
    res.cookie('sb_refresh_token', sess.refresh_token, {
      httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000
    });

    auditLog('user.register', 'email="' + safeUser.email + '" plan="starter" credits=100', req);

    // Welcome email
    sendEmail({
      to: safeUser.email,
      subject: 'مرحباً بك في SAAD STUDIO 🎨',
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#0f0f0f;color:#fff;border-radius:12px">
        <h2 style="color:#a78bfa">مرحباً بك في SAAD STUDIO!</h2>
        <p>تم إنشاء حسابك بنجاح على البريد: <strong>${safeUser.email}</strong></p>
        <p>رصيدك الحالي: <strong style="color:#34d399">${safeUser.credits} كردت</strong></p>
        <p>يمكنك الآن البدء في استخدام أدوات الذكاء الاصطناعي لإنشاء الصور والفيديوهات.</p>
        <a href="https://saadstudio.app" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px">ابدأ الآن</a>
        <hr style="margin:24px 0;border-color:#333">
        <p style="color:#888;font-size:12px">إذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذا البريد.</p>
      </div>`
    });

    res.json({ ok: true, user: safeUser });
  } catch (e) { console.error('[register]', e); res.status(500).json({ error: 'حدث خطأ داخلي' }); }
});

// POST /api/auth/login — unified login (admin + regular users) via Supabase Auth
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    if (!supabase || !supabaseAdmin) return res.status(500).json({ error: 'Auth service not configured' });
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });
    if (String(email).length > 254 || String(password).length > 128)
      return res.status(400).json({ error: 'بيانات غير صالحة' });

    // Sign in via Supabase Auth (anon client for user-facing auth)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).toLowerCase().trim(), password
    });
    if (error || !data?.session) {
      auditLog('user.login.fail', 'email="' + String(email).slice(0, 80) + '"', req);
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const sess = data.session;
    const profile = await getProfile(data.user.id);
    const isAdmin = profile?.is_admin === true;

    // Set HttpOnly cookies
    res.cookie('sb_access_token', sess.access_token, {
      httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: sess.expires_in * 1000
    });
    res.cookie('sb_refresh_token', sess.refresh_token, {
      httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000
    });

    const safeUser = {
      id: data.user.id,
      email: data.user.email,
      credits: profile?.credits ?? 0,
      plan: profile?.plan || 'starter',
      maxCredits: profile?.max_credits ?? 0,
      isAdmin,
      nanoBananaFree: profile?.nano_banana_free !== false,
      role: isAdmin ? 'admin' : 'user',
      createdAt: data.user.created_at,
      renewDate: profile?.renew_date || null,
      subscriptionStartDate: profile?.subscription_start_date || null,
      subscriptionEndDate: profile?.subscription_end_date || null,
    };

    // Admin: also create admin session cookie + CSRF
    if (isAdmin) {
      const sessionId = genToken();
      const csrfToken = genToken();
      const expiry = Date.now() + ADMIN_SESSION_HOURS * 60 * 60 * 1000;
      adminSessions.set(sessionId, { expiry, csrf: csrfToken });
      saveAdminSessions(adminSessions);
      res.cookie('admin_sid', sessionId, {
        httpOnly: true, secure: IS_PROD, sameSite: 'strict', path: '/',
        maxAge: ADMIN_SESSION_HOURS * 60 * 60 * 1000
      });
      auditLog('user.login.success', 'email="' + String(email).slice(0, 80) + '" role=admin', req);
      return res.json({ ok: true, user: safeUser, csrfToken });
    }

    auditLog('user.login.success', 'email="' + String(email).slice(0, 80) + '" role=user', req);
    res.json({ ok: true, user: safeUser });
  } catch (e) { console.error('[login]', e); res.status(500).json({ error: 'حدث خطأ داخلي' }); }
});

// GET /api/auth/me — return current user from Supabase session
app.get('/api/auth/me', (req, res) => {
  if (!req.currentUser) return res.status(401).json({ error: 'غير مسجل' });
  const safeUser = { ...req.currentUser };
  safeUser.role = safeUser.isAdmin ? 'admin' : 'user';
  res.json({ user: safeUser });
});

// POST /api/auth/logout — clear cookies
app.post('/api/auth/logout', (req, res) => {
  if (req.currentUser) {
    auditLog('user.logout', 'email="' + (req.currentUser.email || '').slice(0, 80) + '"', req);
  }
  res.clearCookie('sb_access_token', { httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/' });
  res.clearCookie('sb_refresh_token', { httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/' });
  res.json({ ok: true });
});

// POST /api/auth/refresh — refresh Supabase session using refresh_token cookie
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies && req.cookies.sb_refresh_token;
    if (!refreshToken || !supabase) return res.status(401).json({ error: 'No refresh token' });

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session) return res.status(401).json({ error: 'Session expired' });

    const sess = data.session;
    res.cookie('sb_access_token', sess.access_token, {
      httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: sess.expires_in * 1000
    });
    res.cookie('sb_refresh_token', sess.refresh_token, {
      httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000
    });

    const profile = await getProfile(data.user.id);
    res.json({
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        credits: profile?.credits ?? 0,
        plan: profile?.plan || 'starter',
        maxCredits: profile?.max_credits ?? 0,
        isAdmin: profile?.is_admin === true,
        nanoBananaFree: profile?.nano_banana_free !== false,
        role: profile?.is_admin ? 'admin' : 'user',
        createdAt: data.user.created_at,
      }
    });
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي' }); }
});

// POST /api/auth/credits/consume — server-validated credit deduction
app.post('/api/auth/credits/consume', requireSignedIn, async (req, res) => {
  const { model, params } = req.body || {};
  if (!model) {
    return res.json({ ok: true, credits: req.currentUser.credits ?? 0 });
  }
  const cost = applyProfitMargin(serverCalcCreditCost(String(model), params || {}));
  if (cost <= 0) return res.json({ ok: true, credits: req.currentUser.credits ?? 0 });
  const freshProfile = await getProfile(req.currentUser.id);
  const current = freshProfile?.credits ?? 0;
  if (current < cost) return res.status(402).json({ error: 'رصيد غير كافِ', credits: current, required: cost });
  const updated = await updateProfile(req.currentUser.id, { credits: current - cost });
  res.json({ ok: true, credits: updated?.credits ?? (current - cost) });
});

// GET /api/auth/plans
app.get('/api/auth/plans', (req, res) => res.json({ plans: PLANS }));

// POST /api/auth/order — user requests credit top-up OR plan change (pending admin approval)
app.post('/api/auth/order', requireSignedIn, async (req, res) => {
  // -- Plan-change order --
  if (req.body?.type === 'plan') {
    const PLAN_NAMES = ['starter', 'pro', 'creator'];
    const newPlan = (req.body?.newPlan || '').toLowerCase();
    if (!PLAN_NAMES.includes(newPlan)) return res.status(400).json({ error: 'خطة غير صالحة' });
    if ((req.currentUser.plan || 'starter') === newPlan)
      return res.status(400).json({ error: 'أنت بالفعل على هذه الخطة' });
    const orders = await getAllOrders();
    const dupe = orders.find(o =>
      o.userId === req.currentUser.id && o.type === 'plan' &&
      o.newPlan === newPlan && o.status === 'pending');
    if (dupe) return res.status(409).json({ error: 'لديك طلب معلّق لتغيير الخطة، انتظر مراجعة المدير' });
    const order = {
      id: crypto.randomBytes(10).toString('hex'),
      userId: req.currentUser.id,
      email: req.currentUser.email,
      type: 'plan',
      currentPlan: req.currentUser.plan || 'starter',
      newPlan,
      pack: 0, credits: 0,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    const ok = await createOrder(order);
    if (!ok) return res.status(500).json({ error: 'تعذر حفظ الطلب، حاول مرة أخرى' });
    return res.json({ ok: true, orderId: order.id });
  }

  // -- Credit top-up order --
  const PACKS = { 5: 450, 15: 1500, 30: 3200, 50: 5500 };
  const pack = Number(req.body?.pack || 0);
  const credits = PACKS[pack];
  if (!credits) return res.status(400).json({ error: 'باقة غير صالحة' });
  const orders = await getAllOrders();
  const dupe = orders.find(o => o.userId === req.currentUser.id && o.pack === pack && o.status === 'pending');
  if (dupe) return res.status(409).json({ error: 'لديك طلب معلّق بنفس الباقة، انتظر مراجعة المدير' });
  const order = {
    id: crypto.randomBytes(10).toString('hex'),
    userId: req.currentUser.id,
    email: req.currentUser.email,
    type: 'credits',
    pack, credits,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  const ok = await createOrder(order);
  if (!ok) return res.status(500).json({ error: 'تعذر حفظ الطلب، حاول مرة أخرى' });
  res.json({ ok: true, orderId: order.id, credits });
});



// â•â•â• ADMIN SYSTEM â•â•â•
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
let ADMIN_USERNAME = process.env.ADMIN_USERNAME || '';
const ORDERS_FILE    = path.join(VAULT_DIR, 'orders.json');
const ADMIN_SESSIONS_FILE = path.join(VAULT_DIR, 'admin_sessions.json');

// Load persisted admin sessions (survive server restarts)
function loadAdminSessions(){
  try {
    const raw = JSON.parse(fs.readFileSync(ADMIN_SESSIONS_FILE,'utf8'));
    const map = new Map();
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'number') {
        map.set(k, { expiry: v, csrf: crypto.randomBytes(32).toString('hex') });
      } else if (v && typeof v === 'object') {
        map.set(k, v);
      }
    }
    return map;
  } catch { return new Map(); }
}
function saveAdminSessions(map){
  fs.writeFileSync(ADMIN_SESSIONS_FILE, JSON.stringify(Object.fromEntries(map), null, 2));
}
const adminSessions = loadAdminSessions();

// Clean expired sessions on startup
for (const [k, v] of adminSessions) {
  if (Date.now() > (v.expiry || 0)) adminSessions.delete(k);
}
if (adminSessions.size >= 0) saveAdminSessions(adminSessions);

const ADMIN_SESSION_HOURS = Math.min(24, Math.max(1, Number(process.env.ADMIN_SESSION_HOURS) || 10));

// ─── Protect /admin/ pages: only admin sessions can access ───
app.use('/admin', (req, res, next) => {
  const sessionId = (req.cookies && req.cookies.admin_sid) || '';
  const session = adminSessions.get(sessionId);
  if (!session || Date.now() > session.expiry) {
    if (session) { adminSessions.delete(sessionId); saveAdminSessions(adminSessions); }
    return res.redirect('/');
  }
  next();
});

// dashboard.html is now served from SAAD_STUDIO_MultiPage via registerMultiPageRoutes

function requireAdmin(req, res, next){
  const sessionId = (req.cookies && req.cookies.admin_sid) || '';
  const session = adminSessions.get(sessionId);
  if(!session || Date.now() > session.expiry){
    if(session) { adminSessions.delete(sessionId); saveAdminSessions(adminSessions); }
    return res.status(401).json({ error: 'Admin access required' });
  }
  req.adminSession = session;
  // CSRF validation for state-changing methods
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    const csrfHeader = req.headers['x-csrf-token'] || '';
    if (!csrfHeader || !timingSafeEqual(csrfHeader, session.csrf)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  }
  next();
}

function orderToDb(o){return{id:o.id,user_id:o.userId,email:o.email,type:o.type,current_plan:o.currentPlan||null,new_plan:o.newPlan||null,pack:o.pack||0,credits:o.credits||0,status:o.status||'pending',created_at:o.createdAt,approved_at:o.approvedAt||null,rejected_at:o.rejectedAt||null,amount:o.amount||null};}
function dbToOrder(r){return{id:r.id,userId:r.user_id,email:r.email,type:r.type,currentPlan:r.current_plan||null,newPlan:r.new_plan||null,pack:r.pack||0,credits:r.credits||0,status:r.status,createdAt:r.created_at,approvedAt:r.approved_at||null,rejectedAt:r.rejected_at||null,amount:r.amount||null};}
async function getAllOrders(){if(supabaseAdmin){try{const{data,error}=await supabaseAdmin.from('orders').select('*').order('created_at',{ascending:false});if(!error&&data)return data.map(dbToOrder);}catch(e){console.error('getAllOrders:',e.message);}}try{return(JSON.parse(fs.readFileSync(ORDERS_FILE,'utf8')).orders||[]);}catch{return[];}}
async function createOrder(order){
  if(supabaseAdmin){
    try{
      const { error } = await supabaseAdmin.from('orders').insert(orderToDb(order));
      if(!error) return true;
      console.error('createOrder(supabase):', error.message || error);
    }catch(e){
      console.error('createOrder(supabase):', e.message);
    }
  }
  try{
    const db=JSON.parse(fs.readFileSync(ORDERS_FILE,'utf8'));
    db.orders = Array.isArray(db.orders) ? db.orders : [];
    db.orders.push(order);
    fs.writeFileSync(ORDERS_FILE,JSON.stringify(db,null,2));
    return true;
  }catch{
    try{
      fs.writeFileSync(ORDERS_FILE,JSON.stringify({orders:[order]},null,2));
      return true;
    }catch{
      return false;
    }
  }
}
async function updateOrder(order){
  if(supabaseAdmin){
    try{
      const { error } = await supabaseAdmin.from('orders').update(orderToDb(order)).eq('id',order.id);
      if(!error) return true;
      console.error('updateOrder(supabase):', error.message || error);
    }catch(e){
      console.error('updateOrder(supabase):', e.message);
    }
  }
  try{
    const db=JSON.parse(fs.readFileSync(ORDERS_FILE,'utf8'));
    db.orders = Array.isArray(db.orders) ? db.orders : [];
    const idx=db.orders.findIndex(o=>o.id===order.id);
    if(idx>=0){
      db.orders[idx]=order;
      fs.writeFileSync(ORDERS_FILE,JSON.stringify(db,null,2));
      return true;
    }
    return false;
  }catch{
    return false;
  }
}

// POST /api/admin/login — dashboard.html login (username + password from .env)
app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'بيانات غير مكتملة' });
  if (!timingSafeEqual(String(username).trim(), ADMIN_USERNAME) ||
      !timingSafeEqual(String(password), ADMIN_PASSWORD)) {
    auditLog('admin.login.fail', 'user="' + String(username).slice(0, 80) + '"', req);
    return res.status(401).json({ error: 'بيانات غير صحيحة' });
  }
  const sessionId = crypto.randomBytes(32).toString('hex');
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const expiry = Date.now() + ADMIN_SESSION_HOURS * 60 * 60 * 1000;
  adminSessions.set(sessionId, { expiry, csrf: csrfToken });
  saveAdminSessions(adminSessions);
  res.cookie('admin_sid', sessionId, {
    httpOnly: true, secure: IS_PROD, sameSite: 'strict', path: '/',
    maxAge: ADMIN_SESSION_HOURS * 60 * 60 * 1000
  });
  auditLog('admin.login.success', 'user="' + String(username).slice(0, 80) + '"', req);
  res.json({ ok: true, csrfToken });
});


// GET /api/admin/health — check which Supabase tables exist and are writable
app.get('/api/admin/health', requireAdmin, async (req, res) => {
  const result = { supabaseConnected: !!supabaseAdmin, tables: {}, vaultMode: !supabaseAdmin };
  if (supabaseAdmin) {
    const checks = ['profiles', 'orders', 'cms_settings'];
    for (const tbl of checks) {
      try {
        const { error } = await supabaseAdmin.from(tbl).select('count').limit(1);
        result.tables[tbl] = error ? `ERROR: ${error.message}` : 'OK';
      } catch (e) {
        result.tables[tbl] = `ERROR: ${e.message}`;
      }
    }
    // Check writable
    try {
      await supabaseAdmin.from('cms_settings').upsert({ key: '__health_check__', value: { ok: true }, updated_at: new Date().toISOString() });
      result.tables['cms_settings_write'] = 'OK';
    } catch (e) {
      result.tables['cms_settings_write'] = `ERROR: ${e.message}`;
    }
  }
  result.vaultMode = !supabaseAdmin || Object.values(result.tables).some(v => v !== 'OK' && v !== undefined);
  res.json(result);
});

// GET /api/admin/kie-balance — fetch KIE API balance (same method as /api/kie/credits)
app.get('/api/admin/kie-balance', requireAdmin, async (req, res) => {
  if (!KIE_API_KEY) {
    return res.json({ success: false, noKey: true, message: 'KIE_API_KEY not set' });
  }
  try {
    let data;
    try {
      data = await kieFetch('/chat/credit');
    } catch (_) {
      data = await kieFetch('/user/credits');
    }
    const creditInfo = data?.data || data?.result || data || {};
    const balance = typeof creditInfo === 'number'
      ? creditInfo
      : creditInfo?.credits ?? creditInfo?.remainingCredits ?? creditInfo?.balance ?? null;
    res.json({ success: true, balance });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch balance' });
  }
});

// GET /api/admin/session — validate existing session and return CSRF token
app.get('/api/admin/session', requireAdmin, (req, res) => {
  res.json({ ok: true, csrfToken: req.adminSession.csrf });
});

// POST /api/admin/logout
app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const sessionId = (req.cookies && req.cookies.admin_sid) || '';
  if (sessionId && adminSessions.has(sessionId)) {
    adminSessions.delete(sessionId);
    saveAdminSessions(adminSessions);
  }
  auditLog('admin.logout', null, req);
  res.clearCookie('admin_sid', { httpOnly: true, secure: IS_PROD, sameSite: 'strict', path: '/' });
  res.json({ ok: true });
});


// GET /api/admin/activity — live activity feed
app.get('/api/admin/activity', requireAdmin, (req, res) => {
  try {
    let log = [];
    try { log = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf8')); } catch {}
    if (!Array.isArray(log)) log = [];
    const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit)  || 50));
    const offset = Math.max(0,              parseInt(req.query.offset) || 0);
    const type   = req.query.type || '';   // filter by type
    const search = (req.query.search || '').toLowerCase();
    let filtered = log;
    if (type)   filtered = filtered.filter(e => e.type === type);
    if (search) filtered = filtered.filter(e =>
      (e.email  || '').toLowerCase().includes(search) ||
      (e.model  || '').toLowerCase().includes(search) ||
      (e.prompt || '').toLowerCase().includes(search)
    );
    res.json({ activity: filtered.slice(offset, offset + limit), total: filtered.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/generations — list all user generations
app.get('/api/admin/generations', requireAdmin, (req, res) => {
  try {
    let log = loadGenerations();
    const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit)  || 50));
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const offset = Math.max(0, parseInt(req.query.offset) || ((page - 1) * limit));
    const type   = req.query.type || '';
    const search = (req.query.search || '').toLowerCase();
    let filtered = log;
    if (type === 'image') filtered = filtered.filter(e => !e.isVideo);
    if (type === 'video') filtered = filtered.filter(e => e.isVideo);
    if (type === 'audio') filtered = filtered.filter(e => e.type === 'audio');
    if (search) filtered = filtered.filter(e =>
      (e.email  || '').toLowerCase().includes(search) ||
      (e.model  || '').toLowerCase().includes(search) ||
      (e.prompt || '').toLowerCase().includes(search)
    );
    const images = log.filter(e => !e.isVideo && e.type !== 'audio').length;
    const videos = log.filter(e => e.isVideo || e.type === 'video').length;
    const audio  = log.filter(e => e.type === 'audio').length;
    res.json({
      generations: filtered.slice(offset, offset + limit),
      total: filtered.length,
      stats: { total: log.length, images, videos, audio }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/generations/:id — delete a generation entry
app.delete('/api/admin/generations/:id', requireAdmin, (req, res) => {
  try {
    const log = loadGenerations();
    const idx = log.findIndex(g => g.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });
    const removed = log.splice(idx, 1)[0];
    saveGenerations(log);
    // Also delete local file if it exists
    if (removed.url && removed.url.startsWith('/uploads/')) {
      const fp = path.join(__dirname, 'public', removed.url);
      if (fp.startsWith(path.join(__dirname, 'public', 'uploads')) && fs.existsSync(fp)) {
        fs.unlinkSync(fp);
      }
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/admin/stats — dashboard statistics
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    let totalUsers = 0, totalCredits = 0;
    if (supabaseAdmin) {
      const { data: profiles, error: pErr } = await supabaseAdmin.from('profiles').select('credits');
      if (!pErr && profiles) {
        totalUsers = profiles.length;
        totalCredits = profiles.reduce((s, p) => s + (p.credits || 0), 0);
      }
    }
    if (!totalUsers) {
      const vUsers = getVaultUsers();
      totalUsers = vUsers.length;
      totalCredits = vUsers.reduce((s, u) => s + (u.credits || 0), 0);
    }

    const orders = await getAllOrders();
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter(o => o.status === 'approved')
      .reduce((s, o) => s + (o.amount || o.credits || 0), 0);

    res.json({ totalUsers, totalCredits, totalOrders, totalRevenue });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// GET /api/admin/users — list all profiles (Supabase or vault fallback)
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const safe = (data || []).map(p => ({
          id: p.id, email: p.email, credits: p.credits, plan: p.plan || 'starter',
          maxCredits: p.max_credits || 0, isAdmin: p.is_admin, nanoBananaFree: p.nano_banana_free,
          renewDate: p.renew_date, subscriptionStartDate: p.subscription_start_date,
          subscriptionEndDate: p.subscription_end_date, createdAt: p.created_at, pendingPlan: p.pending_plan
        }));
        return res.json({ users: safe });
      }
    }
    // Vault fallback
    const users = getVaultUsers().map(u => ({
      id: u.id, email: u.email, credits: u.credits, plan: u.plan || 'starter',
      maxCredits: u.maxCredits || 0, isAdmin: u.isAdmin || false, nanoBananaFree: u.nanoBananaFree !== false,
      renewDate: u.renewDate, subscriptionStartDate: u.subscriptionStartDate,
      subscriptionEndDate: u.subscriptionEndDate, createdAt: u.createdAt, pendingPlan: u.pendingPlan,
      provider: u.provider || 'email'
    }));
    res.json({ users });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/users/:id/credits — add credits to user profile
app.post('/api/admin/users/:id/credits', requireAdmin, async (req, res) => {
  try {
    const n = Number(req.body?.amount || 0);
    if (!n) return res.status(400).json({ error: 'Invalid amount' });
    const profile = await getProfile(req.params.id);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    const newCredits = (profile.credits || 0) + n;
    const updated = await updateProfile(req.params.id, { credits: newCredits });
    if (!updated) console.error('[credits] updateProfile returned null for userId:', req.params.id);
    auditLog('admin.user.credits', 'userId="' + req.params.id + '" amount=' + n, req);
    try { logCreditOp(profile.email, 'add', n, 'إضافة يدوية من الداشبورد'); } catch {}
    res.json({ ok: true, credits: updated?.credits ?? newCredits });
  } catch (e) { console.error('credits error:', e.message); res.status(500).json({ error: e.message }); }
});

// POST /api/admin/users/:id/plan — change user plan
app.post('/api/admin/users/:id/plan', requireAdmin, async (req, res) => {
  try {
    const { plan } = req.body || {};
    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });
    const profile = await getProfile(req.params.id);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    const planInfo = PLANS[plan];
    const now = new Date();
    const renewDate = new Date(now); renewDate.setDate(renewDate.getDate() + 30);
    const updated = await updateProfile(req.params.id, {
      plan,
      nano_banana_free: planInfo.nanoBananaFree,
      max_credits: planInfo.credits,
      credits: planInfo.credits,
      renew_date: renewDate.toISOString().split('T')[0],
      subscription_start_date: now.toISOString(),
      subscription_end_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      pending_plan: null
    });
    auditLog('admin.user.plan', 'userId="' + req.params.id + '" plan="' + plan + '" credits=' + planInfo.credits, req);
    res.json({ ok: true, user: { id: req.params.id, email: updated?.email, plan, credits: updated?.credits, maxCredits: planInfo.credits } });
  } catch (e) { console.error('plan error:', e.message); res.status(500).json({ error: e.message }); }
});

// POST /api/admin/users/:id/kick — sign out user
app.post('/api/admin/users/:id/kick', requireAdmin, async (req, res) => {
  try {
    if (supabaseAdmin) {
      await supabaseAdmin.auth.admin.signOut(req.params.id, 'global');
    } else {
      // Vault fallback: clear user tokens
      const users = getVaultUsers();
      const idx = users.findIndex(u => u.id === req.params.id);
      if (idx >= 0) { users[idx].tokens = []; saveVaultUsers(users); }
    }
  } catch (_) {}
  auditLog('admin.user.kick', 'userId="' + req.params.id + '"', req);
  res.json({ ok: true });
});

// GET /api/admin/orders
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  const orders = await getAllOrders();
  res.json({ orders });
});

// POST /api/admin/orders/:id/approve — approve order, update Supabase profile
app.post('/api/admin/orders/:id/approve', requireAdmin, async (req, res) => {
  const orders = await getAllOrders();
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'pending') return res.status(400).json({ error: 'Order is not pending' });
  const profile = await getProfile(order.userId);
  if (!profile) return res.status(404).json({ error: 'User not found' });

  if (order.type === 'plan') {
    const planInfo = PLANS[order.newPlan] || {};
    const planCredits = planInfo.credits || 0;
    const now = new Date();
    const renewDate = new Date(now); renewDate.setDate(renewDate.getDate() + 30);
    await updateProfile(order.userId, {
      plan: order.newPlan,
      max_credits: planCredits,
      credits: planCredits,
      nano_banana_free: planInfo.nanoBananaFree !== false,
      renew_date: renewDate.toISOString().split('T')[0],
      subscription_start_date: now.toISOString(),
      subscription_end_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      pending_plan: null
    });
    order.status = 'approved';
    order.approvedAt = now.toISOString();
    await updateOrder(order);
    auditLog('admin.order.approve', 'orderId="' + req.params.id + '" type=plan newPlan="' + order.newPlan + '"', req);

    // Notify user
    sendEmail({
      to: order.email,
      subject: '✅ تم تفعيل اشتراكك في SAAD STUDIO',
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#0f0f0f;color:#fff;border-radius:12px">
        <h2 style="color:#34d399">تم تفعيل اشتراكك! ✅</h2>
        <p>تهانينا! تم تفعيل خطة <strong style="color:#a78bfa">${order.newPlan}</strong> لحسابك.</p>
        <p>رصيدك الجديد: <strong style="color:#34d399">${planCredits} كردت</strong></p>
        <a href="https://saadstudio.app" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px">ابدأ الاستخدام</a>
      </div>`
    });

    return res.json({ ok: true, plan: order.newPlan, credits: planCredits });
  }

  // Credit top-up approval
  const newCredits = (profile.credits || 0) + order.credits;
  const now = new Date().toISOString();
  await updateProfile(order.userId, { credits: newCredits });
  order.status = 'approved';
  order.approvedAt = now;
  await updateOrder(order);
  auditLog('admin.order.approve', 'orderId="' + req.params.id + '" type=credits amount=' + order.credits, req);

  // Notify user
  sendEmail({
    to: order.email,
    subject: '✅ تم إضافة الكردت لحسابك',
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#0f0f0f;color:#fff;border-radius:12px">
      <h2 style="color:#34d399">تم شحن رصيدك! ✅</h2>
      <p>تمت إضافة <strong style="color:#a78bfa">${order.credits} كردت</strong> لحسابك.</p>
      <p>رصيدك الحالي: <strong style="color:#34d399">${newCredits} كردت</strong></p>
      <a href="https://saadstudio.app" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px">ابدأ الاستخدام</a>
    </div>`
  });

  res.json({ ok: true, credits: newCredits });
});

// POST /api/admin/orders/:id/reject
app.post('/api/admin/orders/:id/reject', requireAdmin, async (req, res) => {
  const orders = await getAllOrders();
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = 'rejected';
  order.rejectedAt = new Date().toISOString();
  await updateOrder(order);
  auditLog('admin.order.reject', 'orderId="' + req.params.id + '" userId="' + order.userId + '"', req);

  // Notify user
  sendEmail({
    to: order.email,
    subject: '❌ تعذّر معالجة طلبك في SAAD STUDIO',
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#0f0f0f;color:#fff;border-radius:12px">
      <h2 style="color:#f87171">تعذّر معالجة الطلب</h2>
      <p>نأسف، لم نتمكن من معالجة طلبك حالياً.</p>
      <p>يرجى التواصل معنا على <a href="mailto:support@saadstudio.app" style="color:#a78bfa">support@saadstudio.app</a> لمزيد من المساعدة.</p>
    </div>`
  });

  res.json({ ok: true });
});


// GET /api/config â€” public client config (safe values only)
// POST /api/contact — public contact form -> sends email to support
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });
app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !message) return res.status(400).json({ error: 'الاسم والبريد والرسالة مطلوبة' });
    if (!String(email).match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return res.status(400).json({ error: 'البريد غير صالح' });
    if (String(message).length > 5000) return res.status(400).json({ error: 'الرسالة طويلة جداً' });
    const safeHtml = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    await sendEmail({
      to: process.env.EMAIL_USER || 'support@saadstudio.app',
      subject: `[تواصل معنا] ${subject || 'رسالة جديدة'} — من ${safeHtml(name)}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#0f0f0f;color:#fff;border-radius:12px">
        <h2 style="color:#a78bfa">رسالة جديدة من نموذج التواصل</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;color:#888;width:100px">الاسم:</td><td style="padding:8px">${safeHtml(name)}</td></tr>
          <tr><td style="padding:8px;color:#888">البريد:</td><td style="padding:8px"><a href="mailto:${safeHtml(email)}" style="color:#a78bfa">${safeHtml(email)}</a></td></tr>
          ${subject ? `<tr><td style="padding:8px;color:#888">الموضوع:</td><td style="padding:8px">${safeHtml(subject)}</td></tr>` : ''}
        </table>
        <hr style="margin:16px 0;border-color:#333">
        <div style="background:#1a1a1a;padding:16px;border-radius:8px;white-space:pre-wrap">${safeHtml(message)}</div>
        <p style="margin-top:16px;color:#888;font-size:12px">يمكنك الرد مباشرة على هذا البريد للتواصل مع المستخدم.</p>
      </div>`,
      text: `من: ${name} <${email}>\nالموضوع: ${subject || '-'}\n\n${message}`
    });
    auditLog('contact.form', `email="${email}" subject="${subject || ''}"`, req);
    res.json({ ok: true });
  } catch (e) { console.error('[contact]', e); res.status(500).json({ error: 'حدث خطأ داخلي' }); }
});

app.get('/api/config', (req, res) => res.json({ googleClientId: GOOGLE_CLIENT_ID }));

// POST /api/auth/google -- Google ID token -> Supabase sign-in
app.post('/api/auth/google', loginLimiter, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Auth service not configured' });
    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'No credential provided' });

    // Verify Google ID token
    const verifyResp = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
    const payload = await verifyResp.json();
    if (!verifyResp.ok || payload.error_description)
      return res.status(401).json({ error: 'Invalid Google token: ' + (payload.error_description || '') });
    // Always enforce audience check — reject tokens from other Google apps
    if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google auth not configured' });
    if (payload.aud !== GOOGLE_CLIENT_ID)
      return res.status(401).json({ error: 'Token audience mismatch' });

    const email = (payload.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'No email in Google token' });

    // Check if user exists in Supabase Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = (existingUsers?.users || []).find(u => u.email === email);
    let userId;

    if (existing) {
      userId = existing.id;
    } else {
      // Create new user in Supabase Auth (random password, Google-only)
      const randomPw = crypto.randomBytes(32).toString('base64');
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email, password: randomPw, email_confirm: true,
        user_metadata: { provider: 'google', google_id: payload.sub }
      });
      if (createErr) return res.status(500).json({ error: 'Failed to create account' });
      userId = newUser.user.id;
    }

    // Generate a session for this user
    // Use admin API to generate a link then exchange for session, or use signInWithPassword workaround
    // Best approach: use admin.generateLink to get session
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink', email
    });

    // Get the token_hash from the link and verify it to create a session
    if (linkErr || !linkData) {
      return res.status(500).json({ error: 'Failed to generate session' });
    }

    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) {
      return res.status(500).json({ error: 'Failed to generate session token' });
    }

    // Verify OTP to get a real session
    const { data: otpData, error: otpErr } = await supabaseAdmin.auth.verifyOtp({
      token_hash: tokenHash, type: 'magiclink'
    });

    if (otpErr || !otpData?.session) {
      return res.status(500).json({ error: 'Failed to create session' });
    }

    const sess = otpData.session;
    const profile = await getProfile(userId);

    // Set HttpOnly cookies
    res.cookie('sb_access_token', sess.access_token, {
      httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: sess.expires_in * 1000
    });
    res.cookie('sb_refresh_token', sess.refresh_token, {
      httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000
    });

    const safeUser = {
      id: userId,
      email: email,
      credits: profile?.credits ?? 100,
      plan: profile?.plan || 'starter',
      maxCredits: profile?.max_credits ?? 0,
      isAdmin: profile?.is_admin === true,
      nanoBananaFree: profile?.nano_banana_free !== false,
      role: profile?.is_admin ? 'admin' : 'user',
      createdAt: profile?.created_at || new Date().toISOString(),
    };

    auditLog('user.login.google', 'email="' + email + '"', req);
    res.json({ ok: true, user: safeUser });
  } catch (e) { console.error('[google-auth]', e); res.status(500).json({ error: 'Internal error' }); }
});

const vaultUpload = multer({ dest: VAULT_DIR, limits:{fileSize:100*1024*1024} });

// Helper: sanitize vault file names to prevent path traversal
function safeVaultName(name) {
  // Allow only safe filenames: alphanumeric, dash, underscore, dot and no path separators
  return path.basename(String(name || '')).replace(/[<>:"/\\|?*\x00-\x1f]/g, '');
}

app.post('/api/vault/upload', requireSignedIn, uploadLimiter, vaultUpload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    if (!isAllowedUpload(req.file, ALLOWED_MEDIA_MIMES)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      auditLog('upload.rejected', 'vault name="' + (req.file.originalname||'').slice(0,80) + '" mime="' + req.file.mimetype + '"', req);
      return res.status(400).json({ error: 'نوع الملف غير مسموح' });
    }
    const ext = path.extname(req.file.originalname||'file').slice(0,10);
    const newName = Date.now() + '_' + Math.random().toString(36).slice(2) + ext;
    const newPath = path.join(VAULT_DIR, newName);
    // Ensure resolved path stays within VAULT_DIR
    if (!path.resolve(newPath).startsWith(path.resolve(VAULT_DIR) + path.sep) &&
        path.resolve(newPath) !== path.resolve(VAULT_DIR)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ error: 'Invalid file path' });
    }
    fs.renameSync(req.file.path, newPath);
    auditLog('upload.success', 'vault name="' + newName + '" user="' + (req.currentUser?.email||'unknown') + '"', req);
    res.json({ url: '/api/vault/file/' + newName, name: req.file.originalname, size: req.file.size });
  } catch(e){ res.status(500).json({error:'Upload failed'}); }
});

app.get('/api/vault/file/:name', requireAdmin, (req, res) => {
  const name = safeVaultName(req.params.name);
  if (!name) return res.status(400).end();
  const file = path.resolve(VAULT_DIR, name);
  // Prevent path traversal
  if (!file.startsWith(path.resolve(VAULT_DIR) + path.sep)) return res.status(400).end();
  // Only allow media files — no JSON data files
  const ext = path.extname(file).toLowerCase();
  const allowedExts = ['.jpg','.jpeg','.png','.gif','.webp','.avif','.mp4','.mov','.webm'];
  if (!allowedExts.includes(ext)) return res.status(403).end();
  if(!fs.existsSync(file)) return res.status(404).end();
  res.sendFile(file);
});

app.get('/api/vault/list', requireAdmin, (req, res) => {
  try {
    const files = fs.readdirSync(VAULT_DIR)
      .filter(f => {
        // Only list uploaded media files (not JSON data files)
        const ext = path.extname(f).toLowerCase();
        return ['.jpg','.jpeg','.png','.gif','.webp','.avif','.mp4','.mov','.webm'].includes(ext);
      })
      .map(f => ({
        name: f,
        url: '/api/vault/file/' + f,
        size: fs.statSync(path.join(VAULT_DIR,f)).size
      }));
    res.json(files);
  } catch(e){ res.json([]); }
});

app.delete('/api/vault/file/:name', requireAdmin, (req, res) => {
  try {
    const name = safeVaultName(req.params.name);
    if (!name) return res.status(400).json({ error: 'Invalid file name' });
    // Protect critical data files
    const protect = ['users.json','orders.json','admin_sessions.json','theme.json','fonts.json','usage.json'];
    if (protect.includes(name)) return res.status(403).json({ error: 'Cannot delete this file' });
    const file = path.resolve(VAULT_DIR, name);
    if (!file.startsWith(path.resolve(VAULT_DIR) + path.sep)) return res.status(400).json({ error: 'Invalid path' });
    if(fs.existsSync(file)) fs.unlinkSync(file);
    res.json({ok:true});
  } catch(e){ res.status(500).json({error:'Delete failed'}); }
});

// â•â•â• SITE MANAGEMENT (Theme / Fonts / Assets / Credentials) â•â•â•
const THEME_FILE = path.join(VAULT_DIR, 'theme.json');
const FONTS_FILE  = path.join(VAULT_DIR, 'fonts.json');

const DEFAULT_THEME = {
  '--bg':'#0b1e34','--bg1':'#0f2a44','--bg2':'#0c243d','--bg3':'#12314f','--bg4':'#173a5c',
  '--amber':'#ff9e2c','--amber2':'#ffa94a','--amber3':'#ffd7a0',
  '--cyan':'#00e5ff','--cyan2':'#2ff3d7',
  '--red':'#ff6b6b','--green':'#59d98a',
  '--tx':'#f2f6ff','--tx2':'#b5c7dd','--tx3':'#7c93aa'
};
const DEFAULT_FONTS = {
  '--far':"'Inter',sans-serif",
  '--fd':"'Bebas Neue',sans-serif",
  '--fm':"'JetBrains Mono',monospace",
  googleFontsUrl:'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Kufi+Arabic:wght@300;400;600;700&family=JetBrains+Mono:wght@400;600&family=Inter:wght@300;400;500;600&display=swap'
};

// Public CSS override â€” applied on every page load
app.get('/api/site-config.css', async (req, res) => {
  try {
    let theme = {}, fonts = {};
    if (supabaseAdmin) {
      const [{data:td},{data:fd}] = await Promise.all([
        supabaseAdmin.from('cms_settings').select('value').eq('key','theme').single(),
        supabaseAdmin.from('cms_settings').select('value').eq('key','fonts').single()
      ]);
      if (td?.value) theme = td.value;
      if (fd?.value) fonts = fd.value;
    } else {
      theme = fs.existsSync(THEME_FILE) ? JSON.parse(fs.readFileSync(THEME_FILE,'utf8')) : {};
      fonts = fs.existsSync(FONTS_FILE) ? JSON.parse(fs.readFileSync(FONTS_FILE,'utf8')) : {};
    }
    const vars  = { ...theme };
    if(fonts['--far']) vars['--far'] = fonts['--far'];
    if(fonts['--fd'])  vars['--fd']  = fonts['--fd'];
    if(fonts['--fm'])  vars['--fm']  = fonts['--fm'];
    const cssVars = Object.keys(vars).length
      ? ':root{' + Object.entries(vars).map(([k,v])=>`${k}:${v}`).join(';') + ';}'
      : '';
    const fontImport = fonts.googleFontsUrl ? `@import url('${fonts.googleFontsUrl}');\n` : '';
    res.set('Cache-Control','no-store').type('text/css').send(fontImport + cssVars);
  } catch { res.type('text/css').send(''); }
});

app.get('/api/admin/theme', requireAdmin, async (req, res) => {
  try {
    let theme = DEFAULT_THEME;
    if (supabaseAdmin) {
      const {data} = await supabaseAdmin.from('cms_settings').select('value').eq('key','theme').single();
      if (data?.value) theme = data.value;
    } else {
      theme = fs.existsSync(THEME_FILE) ? JSON.parse(fs.readFileSync(THEME_FILE,'utf8')) : DEFAULT_THEME;
    }
    res.json({ theme, defaults: DEFAULT_THEME });
  } catch { res.json({ theme: DEFAULT_THEME, defaults: DEFAULT_THEME }); }
});
app.post('/api/admin/theme', requireAdmin, async (req, res) => {
  const { theme } = req.body || {};
  if(!theme || typeof theme !== 'object') return res.status(400).json({ error: 'Invalid theme' });
  let savedToSupabase = false;
  if (supabaseAdmin) {
    try { await supabaseAdmin.from('cms_settings').upsert({key:'theme',value:theme,updated_at:new Date().toISOString()}); savedToSupabase = true; } catch(e) { console.error('theme save supabase:', e.message); }
  }
  try { fs.writeFileSync(THEME_FILE, JSON.stringify(theme, null, 2)); } catch {}
  auditLog('admin.theme.change', null, req);
  res.json({ ok: true, savedToSupabase, warning: !savedToSupabase ? 'تحذير: تم الحفظ في الذاكرة المؤقتة فقط — الجدول cms_settings غير موجود في Supabase' : undefined });
});

app.get('/api/admin/fonts', requireAdmin, async (req, res) => {
  try {
    let fonts = DEFAULT_FONTS;
    if (supabaseAdmin) {
      const {data} = await supabaseAdmin.from('cms_settings').select('value').eq('key','fonts').single();
      if (data?.value) fonts = data.value;
    } else {
      fonts = fs.existsSync(FONTS_FILE) ? JSON.parse(fs.readFileSync(FONTS_FILE,'utf8')) : DEFAULT_FONTS;
    }
    res.json({ fonts, defaults: DEFAULT_FONTS });
  } catch { res.json({ fonts: DEFAULT_FONTS, defaults: DEFAULT_FONTS }); }
});
app.post('/api/admin/fonts', requireAdmin, async (req, res) => {
  const { fonts } = req.body || {};
  if(!fonts) return res.status(400).json({ error: 'fonts required' });
  let savedToSupabase = false;
  if (supabaseAdmin) {
    try { await supabaseAdmin.from('cms_settings').upsert({key:'fonts',value:fonts,updated_at:new Date().toISOString()}); savedToSupabase = true; } catch(e) { console.error('fonts save supabase:', e.message); }
  }
  try { fs.writeFileSync(FONTS_FILE, JSON.stringify(fonts, null, 2)); } catch {}
  auditLog('admin.fonts.change', null, req);
  res.json({ ok: true, savedToSupabase, warning: !savedToSupabase ? 'تحذير: تم الحفظ في الذاكرة المؤقتة فقط — الجدول cms_settings غير موجود في Supabase' : undefined });
});

// Admin: read current API key status (masked)
app.get('/api/admin/credentials', requireAdmin, (req, res) => {
  const keys = {};
  const envKeys = {
    kieApiKey: 'KIE_API_KEY',
    googleApiKey: 'GOOGLE_API_KEY',
    openaiApiKey: 'OPENAI_API_KEY',
    elevenlabsApiKey: 'ELEVENLABS_API_KEY',
    replicateApiKey: 'REPLICATE_API_KEY',
    falApiKey: 'FAL_API_KEY'
  };
  for (const [jsonKey, envKey] of Object.entries(envKeys)) {
    const val = process.env[envKey] || '';
    if (val) keys[jsonKey] = val.slice(0, 4) + '••••' + val.slice(-4);
  }
  res.json(keys);
});

// Admin: save KIE API key
app.post('/api/admin/kie-api-key', requireAdmin, (req, res) => {
  const { key } = req.body || {};
  if (!key) return res.status(400).json({ error: 'key required' });
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  try { envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''; } catch {}
  if (/^KIE_API_KEY=.*/m.test(envContent)) { envContent = envContent.replace(/^KIE_API_KEY=.*/m, `KIE_API_KEY=${String(key).trim()}`); }
  else { envContent += `\nKIE_API_KEY=${String(key).trim()}`; }
  fs.writeFileSync(envPath, envContent);
  auditLog('admin.kie-key.change', null, req);
  res.json({ ok: true });
});

// Admin: test KIE API key
app.post('/api/admin/kie-test', requireAdmin, async (req, res) => {
  try {
    if (!KIE_API_KEY) return res.json({ ok: false, error: 'No KIE_API_KEY set' });
    res.json({ ok: true, message: 'Key is configured' });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// Admin: save any API key (google, openai, elevenlabs, replicate, fal)
const ALLOWED_API_KEY_NAMES = {
  googleApiKey: 'GOOGLE_API_KEY',
  openaiApiKey: 'OPENAI_API_KEY',
  elevenlabsApiKey: 'ELEVENLABS_API_KEY',
  replicateApiKey: 'REPLICATE_API_KEY',
  falApiKey: 'FAL_API_KEY'
};
app.post('/api/admin/api-key', requireAdmin, (req, res) => {
  const { keyName, value } = req.body || {};
  const envVar = ALLOWED_API_KEY_NAMES[keyName];
  if (!envVar) return res.status(400).json({ error: 'مفتاح غير مسموح به' });
  if (!value || typeof value !== 'string' || value.trim().length < 8)
    return res.status(400).json({ error: 'قيمة المفتاح غير صالحة' });
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  try { envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''; } catch {}
  const cleanVal = value.trim().replace(/[^\x20-\x7E]/g, '');
  const regex = new RegExp(`^${envVar}=.*`, 'm');
  if (regex.test(envContent)) { envContent = envContent.replace(regex, `${envVar}=${cleanVal}`); }
  else { envContent += `\n${envVar}=${cleanVal}`; }
  fs.writeFileSync(envPath, envContent);
  process.env[envVar] = cleanVal;
  auditLog('admin.api-key.change', `keyName=${keyName}`, req);
  res.json({ ok: true });
});

// Admin: test any API key (just checks if it's configured)
app.post('/api/admin/api-key/test', requireAdmin, (req, res) => {
  const { keyName } = req.body || {};
  const envVar = ALLOWED_API_KEY_NAMES[keyName];
  if (!envVar) return res.status(400).json({ ok: false, error: 'مفتاح غير معروف' });
  const val = process.env[envVar] || '';
  res.json({ ok: !!val, configured: !!val });
});

// Admin: test model API reachability
app.post('/api/admin/model-test', requireAdmin, async (req, res) => {
  const { modelId } = req.body || {};
  if (!modelId) return res.status(400).json({ ok: false });
  // Just check if the server is running and key is set
  const hasKey = !!KIE_API_KEY;
  res.json({ ok: hasKey, modelId, message: hasKey ? 'KIE key is configured' : 'KIE_API_KEY not set' });
});

// Admin credentials change
app.post('/api/admin/credentials', passwordChangeLimiter, requireAdmin, (req, res) => {
  const { newUsername, newPassword, currentPassword } = req.body || {};
  if(!currentPassword || !timingSafeEqual(String(currentPassword), ADMIN_PASSWORD))
    return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  if(newPassword && String(newPassword).trim().length < 12)
    return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 12 حرفاً على الأقل' });
  if(newPassword && String(newPassword).trim().length > 128)
    return res.status(400).json({ error: 'كلمة المرور طويلة جداً' });
  if(newPassword && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(String(newPassword).trim()))
    return res.status(400).json({ error: 'كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم' });
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath,'utf8') : '';
  if(newUsername && newUsername.trim()) {
    const u = newUsername.trim();
    if(/^ADMIN_USERNAME=.*/m.test(envContent)) { envContent = envContent.replace(/^ADMIN_USERNAME=.*/m, `ADMIN_USERNAME=${u}`); }
    else { envContent += `\nADMIN_USERNAME=${u}`; }
    ADMIN_USERNAME = u;
  }
  if(newPassword && newPassword.trim()) {
    const p = newPassword.trim();
    if(/^ADMIN_PASSWORD=.*/m.test(envContent)) { envContent = envContent.replace(/^ADMIN_PASSWORD=.*/m, `ADMIN_PASSWORD=${p}`); }
    else { envContent += `\nADMIN_PASSWORD=${p}`; }
    ADMIN_PASSWORD = p;
  }
  fs.writeFileSync(envPath, envContent);
  // Invalidate all admin sessions so re-login is required
  adminSessions.clear();
  saveAdminSessions(adminSessions);
  auditLog('admin.credentials.change', 'username_changed=' + (!!newUsername) + ' password_changed=' + (!!newPassword), req);
  res.clearCookie('admin_sid', { httpOnly: true, secure: IS_PROD, sameSite: 'strict', path: '/' });
  res.json({ ok: true });
});

// Assets management
const assetsMemUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10*1024*1024 } });
app.get('/api/admin/assets', requireAdmin, (req, res) => {
  const assetsDir = path.join(__dirname, 'public', 'assets');
  const files = [];
  function scan(dir, base) {
    for(const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      const rel  = base ? base + '/' + f : f;
      if(fs.statSync(full).isDirectory()) { scan(full, rel); }
      else { files.push({ name: f, rel, url: '/assets/' + rel, size: fs.statSync(full).size }); }
    }
  }
  scan(assetsDir, '');
  res.json({ files });
});
app.post('/api/admin/assets/upload', requireAdmin, uploadLimiter, assetsMemUpload.single('file'), (req, res) => {
  const targetPath = String(req.body?.targetPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if(!targetPath) return res.status(400).json({ error: 'targetPath required' });
  const assetsDir = path.join(__dirname, 'public', 'assets');
  const fullPath  = path.resolve(assetsDir, targetPath);
  if(!fullPath.startsWith(path.resolve(assetsDir))) return res.status(400).json({ error: 'Invalid path' });
  if(!req.file) return res.status(400).json({ error: 'file required' });
  if(!ALLOWED_ASSET_MIMES.has(req.file.mimetype)) {
    auditLog('upload.rejected', 'asset mime="' + req.file.mimetype + '"', req);
    return res.status(400).json({ error: 'نوع الملف غير مسموح' });
  }
  const dirPath = path.dirname(fullPath);
  if(!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(fullPath, req.file.buffer);
  auditLog('admin.asset.upload', 'path="' + targetPath + '"', req);
  res.json({ ok: true, url: '/assets/' + targetPath });
});


// === MEDIA MANAGER (Supabase Storage) ===
const MEDIA_BUCKET = 'media';
const MEDIA_ALLOWED = new Set(['image/jpeg','image/png','image/gif','image/webp','image/avif']); // SVG removed — XSS risk
const mediaMemUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10*1024*1024 } });

app.get('/api/admin/media', requireAdmin, async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
  const { data, error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) return res.status(500).json({ error: error.message });
  const files = (data || []).filter(f => f.name && !f.name.endsWith('/')).map(f => {
    const { data: urlData } = supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(f.name);
    return { name: f.name, size: f.metadata?.size || 0, type: f.metadata?.mimetype || '', created: f.created_at, url: urlData?.publicUrl || '' };
  });
  res.json({ files });
});

app.post('/api/admin/media/upload', requireAdmin, uploadLimiter, mediaMemUpload.single('file'), async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
  if (!req.file) return res.status(400).json({ error: 'file required' });
  if (!MEDIA_ALLOWED.has(req.file.mimetype)) return res.status(400).json({ error: 'File type not allowed' });
  const ext = path.extname(req.file.originalname) || '.png';
  const safeName = Date.now() + '_' + crypto.randomBytes(6).toString('hex') + ext;
  const { error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).upload(safeName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
  if (error) return res.status(500).json({ error: error.message });
  const { data: urlData } = supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(safeName);
  auditLog('admin.media.upload', 'file="' + safeName + '"', req);
  res.json({ ok: true, name: safeName, url: urlData?.publicUrl || '' });
});

app.delete('/api/admin/media/:name', requireAdmin, async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
  const name = req.params.name;
  if (!name) return res.status(400).json({ error: 'name required' });
  const { error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).remove([name]);
  if (error) return res.status(500).json({ error: error.message });
  auditLog('admin.media.delete', 'file="' + name + '"', req);
  res.json({ ok: true });
});


// --- HOMEPAGE CMS (slider + model cards) ---
function loadHomepage() {
  try { return JSON.parse(fs.readFileSync(HOMEPAGE_FILE, 'utf8')); }
  catch { return { header: { title: '', subtitle: '' }, slides: [], models: [] }; }
}
function saveHomepage(data) {
  fs.writeFileSync(HOMEPAGE_FILE, JSON.stringify(data, null, 2));
}

// Public: frontend fetches this to render the homepage dynamically
app.get('/api/homepage-data', (req, res) => {
  try {
    const hp = loadHomepage();
    hp.slides = (hp.slides || []).sort((a, b) => (a.order || 0) - (b.order || 0));
    hp.models = (hp.models || []).sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(hp);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: get full homepage data for editing
app.get('/api/admin/homepage', requireAdmin, (req, res) => {
  try { res.json(loadHomepage()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: save full homepage data
app.put('/api/admin/homepage', requireAdmin, (req, res) => {
  try {
    const { header, slides, models } = req.body || {};
    if (!header || !Array.isArray(slides) || !Array.isArray(models))
      return res.status(400).json({ error: 'Invalid data structure' });
    // Sanitize
    const clean = {
      header: {
        title: String(header.title || '').slice(0, 200),
        subtitle: String(header.subtitle || '').slice(0, 500)
      },
      slides: slides.map((s, i) => ({
        id: String(s.id || crypto.randomBytes(6).toString('hex')),
        tag: String(s.tag || '').slice(0, 100),
        title: String(s.title || '').slice(0, 100),
        desc: String(s.desc || '').slice(0, 500),
        image: String(s.image || ''),
        link: String(s.link || '').slice(0, 200),
        order: typeof s.order === 'number' ? s.order : i
      })),
      models: models.map((m, i) => ({
        id: String(m.id || crypto.randomBytes(6).toString('hex')),
        pill: String(m.pill || '').slice(0, 100),
        title: String(m.title || '').slice(0, 100),
        sub: String(m.sub || '').slice(0, 200),
        image: String(m.image || ''),
        link: String(m.link || '').slice(0, 200),
        order: typeof m.order === 'number' ? m.order : i
      }))
    };
    saveHomepage(clean);
    auditLog('admin.homepage.update', 'slides=' + clean.slides.length + ' models=' + clean.models.length, req);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: upload image for homepage (slider or model card)
app.post('/api/admin/homepage/upload-image', requireAdmin, uploadLimiter, mediaMemUpload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    if (!ALLOWED_IMAGE_MIMES.has(req.file.mimetype))
      return res.status(400).json({ error: 'Only images allowed' });
    const targetDir = req.body.type === 'slide' ? 'market-w' : 'market-h';
    const dir = path.join(__dirname, 'public', 'assets', targetDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const ext = path.extname(req.file.originalname || '.png').toLowerCase() || '.png';
    const safeName = 'hp-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext;
    const filePath = path.join(dir, safeName);
    // Ensure path stays within expected directory
    if (!filePath.startsWith(dir + path.sep) && filePath !== dir) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    fs.writeFileSync(filePath, req.file.buffer);
    const url = '/assets/' + targetDir + '/' + safeName;
    auditLog('admin.homepage.upload', 'file="' + safeName + '" type="' + targetDir + '"', req);
    res.json({ ok: true, url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REAL DASHBOARD API ROUTES (vault-backed)
// ═══════════════════════════════════════════════════════════════════════════════

const NOTIFICATIONS_FILE = path.join(VAULT_DIR, 'notifications.json');
const COUPONS_FILE       = path.join(VAULT_DIR, 'coupons.json');
const MODEL_SETTINGS_FILE = path.join(VAULT_DIR, 'model_settings.json');
const CREDIT_LOG_FILE    = path.join(VAULT_DIR, 'credit_log.json');
const PLAN_SETTINGS_FILE = path.join(VAULT_DIR, 'plan_settings.json');
const MODERATION_FILE    = path.join(VAULT_DIR, 'moderation.json');
const BACKUPS_DIR        = path.join(VAULT_DIR, 'backups');
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

// ── Generic vault helpers ──
function vaultRead(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function vaultWrite(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ══════════════════════════════════════
// ANALYTICS — aggregate real data from usage.json + activity.json + users
// ══════════════════════════════════════
app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 90);
    const usage = loadUsage();
    const activity = vaultRead(ACTIVITY_FILE, []);
    const labels = [];
    const genCounts = [];
    const revCounts = [];
    const newUserCounts = [];
    const modelMap = {};

    // Build date labels
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
      labels.push(d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }));

      // Count generations per day from activity log
      const dayGens = Array.isArray(activity) ? activity.filter(a => a.createdAt && a.createdAt.startsWith(key)).length : 0;
      genCounts.push(dayGens);

      // Revenue: sum credits from approved orders for this day
      let dayRev = 0;
      try {
        const orders = await getAllOrders();
        orders.filter(o => o.status === 'approved' && o.approvedAt && o.approvedAt.startsWith(key))
              .forEach(o => { dayRev += (o.pack || 0); });
      } catch {}
      revCounts.push(dayRev);

      // New users: count users created on this day
      let dayNewUsers = 0;
      try {
        if (supabaseAdmin) {
          const { count } = await supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true })
            .gte('created_at', key + 'T00:00:00').lt('created_at', key + 'T23:59:59');
          dayNewUsers = count || 0;
        } else {
          dayNewUsers = getVaultUsers().filter(u => u.createdAt && u.createdAt.startsWith(key)).length;
        }
      } catch {}
      newUserCounts.push(dayNewUsers);
    }

    // Model usage distribution from activity log
    if (Array.isArray(activity)) {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
      activity.filter(a => new Date(a.createdAt) >= cutoff).forEach(a => {
        const m = a.model || 'Other';
        modelMap[m] = (modelMap[m] || 0) + 1;
      });
    }

    // Also aggregate from usage.json per-user data
    if (Object.keys(modelMap).length === 0) {
      for (const uid of Object.keys(usage)) {
        for (const dateKey of Object.keys(usage[uid])) {
          if (dateKey.includes('-') && dateKey.length === 10) {
            const u = usage[uid][dateKey];
            if (u.images) modelMap['Images'] = (modelMap['Images'] || 0) + u.images;
            if (u.videos) modelMap['Videos'] = (modelMap['Videos'] || 0) + u.videos;
          }
        }
      }
    }

    res.json({ labels, generations: genCounts, revenue: revCounts, newUsers: newUserCounts, models: modelMap });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════
app.post('/api/admin/notifications', requireAdmin, (req, res) => {
  const { target, title, body, type } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });
  const notifications = vaultRead(NOTIFICATIONS_FILE, []);
  const notif = {
    id: crypto.randomBytes(8).toString('hex'),
    target: String(target || 'all'),
    title: String(title).slice(0, 200),
    body: String(body).slice(0, 1000),
    type: String(type || 'info'),
    createdAt: new Date().toISOString()
  };
  notifications.unshift(notif);
  if (notifications.length > 500) notifications.length = 500;
  vaultWrite(NOTIFICATIONS_FILE, notifications);
  auditLog('admin.notification.send', `target=${notif.target} title="${notif.title}"`, req);
  res.json({ ok: true, notification: notif });
});
app.get('/api/admin/notifications', requireAdmin, (req, res) => {
  const notifications = vaultRead(NOTIFICATIONS_FILE, []);
  res.json({ notifications });
});

// ══════════════════════════════════════
// COUPONS
// ══════════════════════════════════════
app.get('/api/admin/coupons', requireAdmin, (req, res) => {
  const coupons = vaultRead(COUPONS_FILE, []);
  const active = coupons.filter(c => c.active).length;
  const totalUsed = coupons.reduce((s, c) => s + (c.used || 0), 0);
  const totalDiscount = coupons.reduce((s, c) => s + ((c.used || 0) * (c.value || 0)), 0);
  const expired = coupons.filter(c => c.expiresAt && new Date(c.expiresAt) < new Date()).length;
  res.json({ coupons, stats: { active, totalUsed, totalDiscount, expired } });
});
app.post('/api/admin/coupons', requireAdmin, (req, res) => {
  const { code, type, value, maxUses, expiresAt } = req.body || {};
  if (!code || !value) return res.status(400).json({ error: 'code and value required' });
  const coupons = vaultRead(COUPONS_FILE, []);
  // Check duplicate code
  if (coupons.find(c => c.code === String(code).toUpperCase())) {
    return res.status(400).json({ error: 'كود الكوبون موجود مسبقاً' });
  }
  const coupon = {
    id: crypto.randomBytes(8).toString('hex'),
    code: String(code).toUpperCase().slice(0, 30),
    type: type === 'credits' ? 'credits' : 'percent',
    value: Math.max(0, Number(value)),
    maxUses: maxUses ? Math.max(0, Number(maxUses)) : null,
    expiresAt: expiresAt || null,
    used: 0,
    active: true,
    createdAt: new Date().toISOString()
  };
  coupons.unshift(coupon);
  vaultWrite(COUPONS_FILE, coupons);
  auditLog('admin.coupon.create', `code=${coupon.code} type=${coupon.type} value=${coupon.value}`, req);
  res.json({ ok: true, coupon });
});
app.post('/api/admin/coupons/:id/toggle', requireAdmin, (req, res) => {
  const coupons = vaultRead(COUPONS_FILE, []);
  const c = coupons.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'Coupon not found' });
  c.active = !c.active;
  vaultWrite(COUPONS_FILE, coupons);
  auditLog('admin.coupon.toggle', `code=${c.code} active=${c.active}`, req);
  res.json({ ok: true, active: c.active });
});
app.delete('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  let coupons = vaultRead(COUPONS_FILE, []);
  const removed = coupons.find(x => x.id === req.params.id);
  coupons = coupons.filter(x => x.id !== req.params.id);
  vaultWrite(COUPONS_FILE, coupons);
  if (removed) auditLog('admin.coupon.delete', `code=${removed.code}`, req);
  res.json({ ok: true });
});

// ══════════════════════════════════════
// BACKUPS & EXPORT
// ══════════════════════════════════════
app.get('/api/admin/backups', requireAdmin, (req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json') || f.endsWith('.zip'))
      .map(f => ({
        id: f,
        type: f.includes('users') ? 'مستخدمين' : f.includes('orders') ? 'طلبات' : f.includes('full') ? 'نسخة كاملة' : 'بيانات',
        createdAt: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.toISOString(),
        url: `/api/admin/backups/${encodeURIComponent(f)}`
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ backups: files });
  } catch { res.json({ backups: [] }); }
});

// Download a specific backup
app.get('/api/admin/backups/:filename', requireAdmin, (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(BACKUPS_DIR, safeName);
  if (!fs.existsSync(filePath) || !filePath.startsWith(path.resolve(BACKUPS_DIR))) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.download(filePath);
});

// Create backup
app.post('/api/admin/backups', requireAdmin, async (req, res) => {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      date: new Date().toISOString(),
      users: [],
      orders: [],
      cms: vaultRead(path.join(VAULT_DIR, 'cms.json'), {}),
      theme: vaultRead(THEME_FILE, {}),
      homepage: vaultRead(HOMEPAGE_FILE, {}),
      notifications: vaultRead(NOTIFICATIONS_FILE, []),
      coupons: vaultRead(COUPONS_FILE, []),
      modelSettings: vaultRead(MODEL_SETTINGS_FILE, {}),
      planSettings: vaultRead(PLAN_SETTINGS_FILE, {}),
    };
    try {
      if (supabaseAdmin) {
        const { data } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false });
        backupData.users = data || getVaultUsers();
      } else { backupData.users = getVaultUsers(); }
    } catch { backupData.users = getVaultUsers(); }
    try { backupData.orders = await getAllOrders(); } catch {}
    const filename = `full-backup-${stamp}.json`;
    fs.writeFileSync(path.join(BACKUPS_DIR, filename), JSON.stringify(backupData, null, 2));
    auditLog('admin.backup.create', filename, req);
    res.json({ ok: true, filename });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Export (CSV/JSON download)
app.get('/api/admin/export', requireAdmin, async (req, res) => {
  const type = String(req.query.type || 'users');
  const format = String(req.query.format || 'json');
  try {
    let data;
    if (type === 'users') {
      let users = [];
      try {
        if (supabaseAdmin) {
          const { data: d } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false });
          users = d || [];
        } else { users = getVaultUsers(); }
      } catch { users = getVaultUsers(); }
      data = users;
    } else if (type === 'orders') {
      data = await getAllOrders();
    } else if (type === 'generations') {
      data = vaultRead(GENERATIONS_FILE, []);
    } else if (type === 'activity') {
      data = vaultRead(ACTIVITY_FILE, []);
    } else if (type === 'full') {
      // Full backup — create and return as download
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupData = {
        date: new Date().toISOString(),
        users: [],
        orders: [],
        cms: vaultRead(path.join(VAULT_DIR, 'cms.json'), {}),
        theme: vaultRead(THEME_FILE, {}),
        homepage: vaultRead(HOMEPAGE_FILE, {}),
        activity: vaultRead(ACTIVITY_FILE, []),
        coupons: vaultRead(COUPONS_FILE, []),
        modelSettings: vaultRead(MODEL_SETTINGS_FILE, {}),
        planSettings: vaultRead(PLAN_SETTINGS_FILE, {}),
      };
      try {
        if (supabaseAdmin) {
          const { data: d } = await supabaseAdmin.from('profiles').select('*');
          backupData.users = d || getVaultUsers();
        } else { backupData.users = getVaultUsers(); }
      } catch { backupData.users = getVaultUsers(); }
      try { backupData.orders = await getAllOrders(); } catch {}
      // Save backup to disk
      const filename = `full-backup-${stamp}.json`;
      fs.writeFileSync(path.join(BACKUPS_DIR, filename), JSON.stringify(backupData, null, 2));
      auditLog('admin.export.full', filename, req);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.json(backupData);
    } else {
      data = [];
    }

    if (format === 'csv') {
      if (!Array.isArray(data) || !data.length) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${type}.csv"`);
        return res.send('No data');
      }
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      data.forEach(row => {
        csvRows.push(headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','));
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-${Date.now()}.csv"`);
      return res.send('\ufeff' + csvRows.join('\n'));
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-${Date.now()}.json"`);
    res.json({ exported: true, date: new Date().toISOString(), type, count: Array.isArray(data) ? data.length : 0, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════
// MODEL SETTINGS — per-model cost, limits, enable/disable
// ══════════════════════════════════════
app.get('/api/admin/model-settings', requireAdmin, (req, res) => {
  const settings = vaultRead(MODEL_SETTINGS_FILE, {});
  res.json(settings);
});
app.post('/api/admin/model-settings', requireAdmin, (req, res) => {
  const { modelId, enabled, creditCost, dailyLimit, maxQueue, priority } = req.body || {};
  if (!modelId) return res.status(400).json({ error: 'modelId required' });
  const settings = vaultRead(MODEL_SETTINGS_FILE, {});
  settings[modelId] = {
    ...(settings[modelId] || {}),
    enabled: enabled !== false,
    creditCost: Math.max(0, Number(creditCost) || 0),
    dailyLimit: Math.max(0, Number(dailyLimit) || 0),
    maxQueue: Math.max(1, Number(maxQueue) || 10),
    priority: ['low', 'normal', 'high'].includes(priority) ? priority : 'normal',
    updatedAt: new Date().toISOString()
  };
  vaultWrite(MODEL_SETTINGS_FILE, settings);
  auditLog('admin.model.settings', `model=${modelId} cost=${creditCost} enabled=${enabled}`, req);
  res.json({ ok: true });
});

// ══════════════════════════════════════
// CREDIT LOG — tracks all credit operations
// ══════════════════════════════════════
function logCreditOp(email, action, amount, reason, adminReq) {
  const log = vaultRead(CREDIT_LOG_FILE, []);
  log.unshift({
    id: crypto.randomBytes(8).toString('hex'),
    email: String(email || ''),
    action: String(action || 'add'),
    amount: Number(amount) || 0,
    reason: String(reason || '').slice(0, 200),
    createdAt: new Date().toISOString()
  });
  if (log.length > 5000) log.length = 5000;
  vaultWrite(CREDIT_LOG_FILE, log);
}

app.get('/api/admin/credit-log', requireAdmin, (req, res) => {
  const log = vaultRead(CREDIT_LOG_FILE, []);
  res.json({ log });
});

// ══════════════════════════════════════
// BULK CREDITS — send credits to all or group of users
// ══════════════════════════════════════
app.post('/api/admin/bulk-credits', requireAdmin, async (req, res) => {
  const { target, amount, reason } = req.body || {};
  const n = Number(amount);
  if (!n || n <= 0) return res.status(400).json({ error: 'Invalid amount' });
  try {
    let users = [];
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin.from('profiles').select('id, email, credits');
      users = data || [];
    } else {
      users = getVaultUsers().map(u => ({ id: u.id, email: u.email, credits: u.credits || 0 }));
    }

    // Filter by target
    let targetUsers = users;
    if (target && target !== 'all') {
      const planFilter = String(target).toLowerCase();
      if (['starter', 'pro', 'creator'].includes(planFilter)) {
        if (supabaseAdmin) {
          const { data } = await supabaseAdmin.from('profiles').select('id, email, credits').eq('plan', planFilter);
          targetUsers = data || [];
        } else {
          targetUsers = getVaultUsers().filter(u => (u.plan || 'starter') === planFilter)
            .map(u => ({ id: u.id, email: u.email, credits: u.credits || 0 }));
        }
      }
    }

    let count = 0;
    for (const u of targetUsers) {
      const newCredits = (u.credits || 0) + n;
      await updateProfile(u.id, { credits: newCredits });
      logCreditOp(u.email, 'add', n, reason || 'هدية جماعية من الإدارة', req);
      count++;
    }

    auditLog('admin.bulk-credits', `target=${target} amount=${n} count=${count}`, req);
    res.json({ ok: true, count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════
// USER CREDITS (direct email-based add/deduct/set)
// ══════════════════════════════════════
app.post('/api/admin/user-credits', requireAdmin, async (req, res) => {
  const { email, amount, action, reason } = req.body || {};
  const n = Number(amount);
  if (!email || !n) return res.status(400).json({ error: 'email and amount required' });
  try {
    // Find user by email
    let user = null;
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin.from('profiles').select('*').eq('email', String(email).trim()).single();
      user = data;
    }
    if (!user) {
      user = getVaultUsers().find(u => u.email === String(email).trim());
    }
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    let newCredits;
    if (action === 'set') {
      newCredits = Math.max(0, n);
    } else if (action === 'deduct') {
      newCredits = Math.max(0, (user.credits || 0) - n);
    } else {
      newCredits = (user.credits || 0) + n;
    }

    await updateProfile(user.id, { credits: newCredits });
    logCreditOp(email, action || 'add', n, reason || '', req);
    auditLog('admin.user-credits', `email=${email} action=${action} amount=${n}`, req);
    res.json({ ok: true, credits: newCredits });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════
// FREE TRIAL SETTINGS
// ══════════════════════════════════════
const FREE_TRIAL_FILE = path.join(VAULT_DIR, 'free_trial.json');
app.get('/api/admin/free-trial-settings', requireAdmin, (req, res) => {
  const settings = vaultRead(FREE_TRIAL_FILE, { freeCredits: 100, dailyLimit: 50 });
  res.json(settings);
});
app.post('/api/admin/free-trial-settings', requireAdmin, (req, res) => {
  const { freeCredits, dailyLimit } = req.body || {};
  const settings = {
    freeCredits: Math.max(0, Number(freeCredits) || 100),
    dailyLimit: Math.max(0, Number(dailyLimit) || 50),
    updatedAt: new Date().toISOString()
  };
  vaultWrite(FREE_TRIAL_FILE, settings);
  auditLog('admin.free-trial.update', `credits=${settings.freeCredits} daily=${settings.dailyLimit}`, req);
  res.json({ ok: true });
});

// ══════════════════════════════════════
// PLAN SETTINGS — manage subscription plans and top-ups
// ══════════════════════════════════════
const DEFAULT_PLANS = {
  plans: [
    { id: 'starter', name: 'Starter', price: 10, credits: 1000, features: ['1000 كريدت شهرياً', 'كل النماذج', 'دعم عادي'] },
    { id: 'pro', name: 'Pro', price: 25, credits: 2800, popular: true, features: ['2800 كريدت شهرياً', 'أولوية عالية', 'دعم سريع'] },
    { id: 'creator', name: 'Creator', price: 50, credits: 6000, features: ['6000 كريدت شهرياً', 'أولوية قصوى', 'دعم VIP', 'API access'] }
  ],
  topups: [
    { id: 't5', price: 5, credits: 450 },
    { id: 't15', price: 15, credits: 1500 },
    { id: 't30', price: 30, credits: 3200 },
    { id: 't50', price: 50, credits: 5500 }
  ]
};
app.get('/api/admin/plan-settings', requireAdmin, (req, res) => {
  const data = vaultRead(PLAN_SETTINGS_FILE, DEFAULT_PLANS);
  res.json(data);
});
app.post('/api/admin/plan-settings', requireAdmin, (req, res) => {
  const { plans, topups } = req.body || {};
  if (!Array.isArray(plans)) return res.status(400).json({ error: 'plans array required' });
  const data = { plans, topups: Array.isArray(topups) ? topups : [], updatedAt: new Date().toISOString() };
  vaultWrite(PLAN_SETTINGS_FILE, data);
  // Sync runtime PLANS object so order processing uses the updated values immediately
  for (const p of plans) {
    if (p.id && ['starter','pro','creator'].includes(p.id)) {
      PLANS[p.id] = { price: p.price || 0, credits: p.credits || 0, nanoBananaFree: true, label: p.name || p.id };
    }
  }
  auditLog('admin.plans.update', `plans=${plans.length} topups=${(topups || []).length}`, req);
  res.json({ ok: true });
});

// Load plan settings from vault on startup to sync PLANS object
try {
  const savedPlans = JSON.parse(fs.readFileSync(PLAN_SETTINGS_FILE, 'utf8'));
  if (Array.isArray(savedPlans.plans)) {
    for (const p of savedPlans.plans) {
      if (p.id && ['starter','pro','creator'].includes(p.id)) {
        PLANS[p.id] = { price: p.price || 0, credits: p.credits || 0, nanoBananaFree: true, label: p.name || p.id };
      }
    }
    console.log('[Plans] Loaded from vault:', Object.keys(PLANS).map(k => `${k}=${PLANS[k].credits}cr`).join(', '));
  }
} catch { /* no saved plan settings yet, use defaults */ }

// ══════════════════════════════════════
// MODERATION — content review queue
// ══════════════════════════════════════
app.get('/api/admin/moderation', requireAdmin, (req, res) => {
  const items = vaultRead(MODERATION_FILE, []);
  const pending = items.filter(i => i.status === 'pending').length;
  const blocked = items.filter(i => i.status === 'blocked').length;
  const approved = items.filter(i => i.status === 'approved').length;
  res.json({ items: items.filter(i => i.status === 'pending'), pending, blocked, approved });
});
app.post('/api/admin/moderation', requireAdmin, (req, res) => {
  // Add item to moderation queue (can be called from generation pipeline)
  const { userId, email, reason, thumbnail, contentUrl } = req.body || {};
  const items = vaultRead(MODERATION_FILE, []);
  const item = {
    id: crypto.randomBytes(8).toString('hex'),
    userId: String(userId || ''),
    email: String(email || ''),
    reason: String(reason || 'محتوى مبلّغ عنه').slice(0, 300),
    thumbnail: thumbnail || '',
    contentUrl: contentUrl || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  items.unshift(item);
  if (items.length > 2000) items.length = 2000;
  vaultWrite(MODERATION_FILE, items);
  res.json({ ok: true, item });
});
app.post('/api/admin/moderation/:id', requireAdmin, (req, res) => {
  const { action } = req.body || {};
  if (!['approve', 'block'].includes(action)) return res.status(400).json({ error: 'action must be approve or block' });
  const items = vaultRead(MODERATION_FILE, []);
  const item = items.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  item.status = action === 'approve' ? 'approved' : 'blocked';
  item.moderatedAt = new Date().toISOString();
  vaultWrite(MODERATION_FILE, items);
  auditLog('admin.moderation.' + action, `item=${req.params.id} email=${item.email}`, req);
  res.json({ ok: true });
});

// ══════════════════════════════════════
// REPORTS — generate real reports from data
// ══════════════════════════════════════
app.get('/api/admin/reports/:type', requireAdmin, async (req, res) => {
  const type = req.params.type;
  try {
    if (type === 'usage') {
      const usage = loadUsage();
      const activity = vaultRead(ACTIVITY_FILE, []);
      const totalGens = Array.isArray(activity) ? activity.length : 0;
      const todayKey = new Date().toISOString().split('T')[0];
      const todayGens = Array.isArray(activity) ? activity.filter(a => a.createdAt && a.createdAt.startsWith(todayKey)).length : 0;
      const totalCreditsUsed = Array.isArray(activity) ? activity.reduce((s, a) => s + (a.credits || 0), 0) : 0;
      const modelBreakdown = {};
      if (Array.isArray(activity)) {
        activity.forEach(a => { const m = a.model || 'Other'; modelBreakdown[m] = (modelBreakdown[m] || 0) + 1; });
      }
      res.json({
        title: 'تقرير الاستخدام',
        generatedAt: new Date().toISOString(),
        summary: { totalGenerations: totalGens, todayGenerations: todayGens, totalCreditsUsed, activeUsers: Object.keys(usage).length },
        modelBreakdown,
        recentActivity: (Array.isArray(activity) ? activity.slice(0, 20) : [])
      });
    } else if (type === 'revenue') {
      const orders = await getAllOrders();
      const approved = orders.filter(o => o.status === 'approved');
      const totalRevenue = approved.reduce((s, o) => s + (o.pack || 0), 0);
      const totalCredits = approved.reduce((s, o) => s + (o.credits || 0), 0);
      const monthlyBreakdown = {};
      approved.forEach(o => {
        const month = (o.approvedAt || o.createdAt || '').substring(0, 7);
        if (month) {
          if (!monthlyBreakdown[month]) monthlyBreakdown[month] = { revenue: 0, credits: 0, count: 0 };
          monthlyBreakdown[month].revenue += (o.pack || 0);
          monthlyBreakdown[month].credits += (o.credits || 0);
          monthlyBreakdown[month].count++;
        }
      });
      res.json({
        title: 'تقرير الإيرادات',
        generatedAt: new Date().toISOString(),
        summary: { totalRevenue, totalCreditsDistributed: totalCredits, totalApprovedOrders: approved.length, totalOrders: orders.length },
        monthlyBreakdown
      });
    } else if (type === 'users') {
      let users = [];
      try {
        if (supabaseAdmin) {
          const { data } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false });
          users = data || [];
        } else { users = getVaultUsers(); }
      } catch { users = getVaultUsers(); }
      const planDist = {};
      users.forEach(u => { const p = u.plan || u.plan || 'starter'; planDist[p] = (planDist[p] || 0) + 1; });
      const totalCreditsHeld = users.reduce((s, u) => s + (u.credits || 0), 0);
      res.json({
        title: 'تقرير المستخدمين',
        generatedAt: new Date().toISOString(),
        summary: { totalUsers: users.length, totalCreditsHeld, planDistribution: planDist },
        recentUsers: users.slice(0, 20).map(u => ({ email: u.email, plan: u.plan || 'starter', credits: u.credits || 0, createdAt: u.created_at || u.createdAt }))
      });
    } else if (type === 'models') {
      const activity = vaultRead(ACTIVITY_FILE, []);
      const modelStats = {};
      if (Array.isArray(activity)) {
        activity.forEach(a => {
          const m = a.model || 'Other';
          if (!modelStats[m]) modelStats[m] = { count: 0, credits: 0, types: {} };
          modelStats[m].count++;
          modelStats[m].credits += (a.credits || 0);
          const t = a.type || 'task';
          modelStats[m].types[t] = (modelStats[m].types[t] || 0) + 1;
        });
      }
      res.json({
        title: 'تقرير النماذج',
        generatedAt: new Date().toISOString(),
        modelStats,
        totalModelsUsed: Object.keys(modelStats).length
      });
    } else {
      res.status(400).json({ error: 'Unknown report type. Use: usage, revenue, users, models' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === ADS MANAGER (Supabase) ===

app.get('/api/admin/ads', requireAdmin, async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
  const { data, error } = await supabaseAdmin.from('ads').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ads: data || [] });
});

app.post('/api/admin/ads', requireAdmin, async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
  const { type, title, image_url, link, is_active } = req.body || {};
  if (!type || !title) return res.status(400).json({ error: 'type and title are required' });
  const allowed = ['banner', 'popup', 'hero'];
  if (!allowed.includes(type)) return res.status(400).json({ error: 'type must be banner, popup, or hero' });
  const { data, error } = await supabaseAdmin.from('ads').insert({
    type, title: String(title).slice(0, 200), image_url: String(image_url || '').slice(0, 2000),
    link: String(link || '').slice(0, 2000), is_active: is_active !== false
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  auditLog('admin.ad.create', 'id="' + data.id + '" title="' + data.title + '"', req);
  res.json({ ok: true, ad: data });
});

app.put('/api/admin/ads/:id', requireAdmin, async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
  const id = req.params.id;
  const updates = {};
  const b = req.body || {};
  if (b.type !== undefined) {
    const allowed = ['banner', 'popup', 'hero'];
    if (!allowed.includes(b.type)) return res.status(400).json({ error: 'type must be banner, popup, or hero' });
    updates.type = b.type;
  }
  if (b.title !== undefined) updates.title = String(b.title).slice(0, 200);
  if (b.image_url !== undefined) updates.image_url = String(b.image_url).slice(0, 2000);
  if (b.link !== undefined) updates.link = String(b.link).slice(0, 2000);
  if (b.is_active !== undefined) updates.is_active = !!b.is_active;
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });
  const { data, error } = await supabaseAdmin.from('ads').update(updates).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  auditLog('admin.ad.update', 'id="' + id + '"', req);
  res.json({ ok: true, ad: data });
});

app.delete('/api/admin/ads/:id', requireAdmin, async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });
  const id = req.params.id;
  const { error } = await supabaseAdmin.from('ads').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  auditLog('admin.ad.delete', 'id="' + id + '"', req);
  res.json({ ok: true });
});
// â•â•â• DIRECT PROMPT â•â•â•

// CMS_SYSTEM_START
const CMS_FILE = path.join(VAULT_DIR, 'cms.json'); // file fallback for local dev
function getDefaultCMS(){return{pages:[],sidebar:[],promoBars:[],navigation:{header:[],footer:[]},settings:{siteTitle:'SAAD STUDIO',siteDescription:'Creative AI Platform',logo:'/favicon.png',favicon:'/favicon.png',seoTitle:'SAAD STUDIO - Creative AI',seoDescription:'',contactEmail:'',contactPhone:'',socialLinks:{twitter:'',instagram:'',youtube:'',tiktok:''},analytics:{googleTagId:'',facebookPixelId:''},maintenanceMode:false,maintenanceMessage:'الموقع قيد الصيانة'},auditLog:[]};}
async function loadCMS(){if(supabaseAdmin){try{const{data,error}=await supabaseAdmin.from('cms_settings').select('value').eq('key','cms_state').single();if(!error&&data&&data.value)return data.value;}catch(e){console.error('loadCMS supabase:',e.message);}}try{if(fs.existsSync(CMS_FILE))return JSON.parse(fs.readFileSync(CMS_FILE,'utf8'));}catch{}return getDefaultCMS();}
async function saveCMS(d){let ok=false;if(supabaseAdmin){try{await supabaseAdmin.from('cms_settings').upsert({key:'cms_state',value:d,updated_at:new Date().toISOString()});ok=true;return ok;}catch(e){console.error('saveCMS supabase:',e.message);}}try{fs.writeFileSync(CMS_FILE,JSON.stringify(d,null,2));}catch{}return ok;}
function cmsLog(cms,action,detail){if(!Array.isArray(cms.auditLog))cms.auditLog=[];cms.auditLog.unshift({id:crypto.randomBytes(6).toString('hex'),action,detail,at:new Date().toISOString()});if(cms.auditLog.length>200)cms.auditLog=cms.auditLog.slice(0,200);}
function cmsId(){return crypto.randomBytes(10).toString('hex');}
function sStr(v,max=500){return String(v||'').trim().slice(0,max);}
function validatePageBody(b){const title=sStr(b.title,200);if(!title)return{error:'title is required'};const slug=(sStr(b.slug,100).replace(/[^a-z0-9_/-]/gi,'-').toLowerCase())||'page';return{title,slug,category:sStr(b.category,100)||'main',visible:b.visible!==false,published:b.published===true,order:Number(b.order)||0,seoTitle:sStr(b.seoTitle||b.seo?.title,200),seoDescription:sStr(b.seoDescription||b.seo?.description,500)};}
async function ensureCMSSeed(){try{const cms=await loadCMS();let changed=false;if(!cms.pages||!cms.pages.length){const now=new Date().toISOString();cms.pages=[{id:cmsId(),title:'الرئيسية',slug:'home',category:'main',visible:true,published:true,order:0,seoTitle:'SAAD STUDIO - ذكاء اصطناعي إبداعي',seoDescription:'منصة SAAD STUDIO للذكاء الاصطناعي الإبداعي',sections:[{id:cmsId(),type:'hero',label:'القسم الرئيسي',enabled:true,order:0,data:{title:'SAAD STUDIO',subtitle:'منصة الذكاء الاصطناعي الإبداعي',description:'أنشئ صور ومقاطع فيديو مذهلة بالذكاء الاصطناعي.',buttonText:'ابدأ الآن',buttonLink:'/#tools'},createdAt:now,updatedAt:now},{id:cmsId(),type:'features',label:'مميزات المنصة',enabled:true,order:1,data:{title:'لماذا SAAD STUDIO؟',items:['توليد صور احترافية','إنشاء فيديو بالذكاء الاصطناعي','أدوات تحرير متقدمة']},createdAt:now,updatedAt:now}],createdAt:now,updatedAt:now},{id:cmsId(),title:'من نحن',slug:'about',category:'main',visible:true,published:true,order:1,seoTitle:'من نحن - SAAD STUDIO',seoDescription:'تعرف على منصة SAAD STUDIO وفريق العمل',sections:[{id:cmsId(),type:'text',label:'نص تعريفي',enabled:true,order:0,data:{title:'من نحن',description:'SAAD STUDIO منصة متخصصة في الذكاء الاصطناعي الإبداعي.'},createdAt:now,updatedAt:now}],createdAt:now,updatedAt:now},{id:cmsId(),title:'تواصل معنا',slug:'contact',category:'main',visible:true,published:true,order:2,seoTitle:'تواصل معنا - SAAD STUDIO',seoDescription:'تواصل مع فريق SAAD STUDIO',sections:[{id:cmsId(),type:'contact',label:'نموذج التواصل',enabled:true,order:0,data:{title:'تواصل معنا',email:'info@saadstudio.com',description:'يسعدنا سماع استفساراتك.'},createdAt:now,updatedAt:now}],createdAt:now,updatedAt:now},{id:cmsId(),title:'Legal',slug:'legal',category:'legal',visible:true,published:true,order:10,seoTitle:'الشروط والأحكام - SAAD STUDIO',seoDescription:'شروط الاستخدام وسياسة الخصوصية وسياسة الاسترداد',sections:[{id:cmsId(),type:'richtext',label:'شروط الاستخدام',enabled:true,order:0,data:{title:'شروط الخدمة — Terms of Service',icon:'📋',body:'آخر تحديث: 2026-03-22\n\n**1. قبول الشروط**\nباستخدامك أو وصولك إلى SAAD STUDIO ("المنصة") بما في ذلك جميع المواقع والتطبيقات وواجهات API، فإنك توافق على الالتزام بشروط الخدمة هذه. إذا لم توافق، يجب عدم استخدام المنصة. تشكل هذه الشروط اتفاقية ملزمة قانونياً بينك ("المستخدم") وSAAD STUDIO. نحتفظ بحق تعديل الشروط في أي وقت. استمرارك يعني قبولك.\n\n**2. الأهلية**\n• يجب أن يكون عمرك 18 عاماً على الأقل.\n• يجب تقديم معلومات تسجيل دقيقة وكاملة.\n• أنت مسؤول عن أمان حسابك وجميع الأنشطة تحته.\n\n**3. وصف الخدمات**\nSAAD STUDIO منصة إبداعية سحابية لتوليد الصور والفيديو والموسيقى والنصوص باستخدام نماذج AI متعددة من مزودين خارجيين.\n\n**5. سياسة الاستخدام المقبول**\nتوافق على عدم استخدام المنصة لـ:\n• توليد محتوى غير قانوني أو ضار أو مسيء أو تشهيري.\n• إنشاء مواد استغلال الأطفال (CSAM).\n• توليد صور مزيفة غير رضائية لأشخاص حقيقيين.\n• انتحال شخصيات أو كيانات.\n• انتهاك الملكية الفكرية أو العلامات التجارية أو حقوق النشر.\n• الهندسة العكسية أو تجاوز الأمان.\n• توليد رسائل مزعجة أو برمجيات خبيثة أو تصيد.\n• بناء خدمات AI منافسة باستخدام منصتنا.\n\n**6. ملكية المحتوى**\nتحميلاتك (المدخلات): تحتفظ بملكيتها وتمنحنا ترخيصاً محدوداً للمعالجة. المحتوى المولّد (المخرجات): تملكه بموجب الشروط، لا ضمان للتفرد. الملكية الفكرية للمنصة (التصميم، الكود، العلامات التجارية) تبقى لنا.\n\n**7. إخلاء مسؤولية AI**\nقد يحتوي محتوى AI على أخطاء أو تحيزات أو اتجاهات. المخرجات لا تمثل آراءنا. أنت المسؤول الوحيد عن مراجعة المخرجات. لا تقدمها على أنها بشرية عندما يكون الإفصاح مطلوباً.\n\n**8. المسؤولية والإنهاء**\nالمنصة تُقدم "كما هي". لسنا مسؤولين عن أضرار غير مباشرة. المسؤولية الإجمالية محدودة برسوم 12 شهراً مدفوعة. يجوز الإنهاء للمخالفات أو مخاطر أمنية أو متطلبات قانونية أو عدم النشاط 12+ شهراً. توافق على تعويض SAAD STUDIO من مطالبات ناتجة عن استخدامك.\n\nللتواصل: support@saadstudio.com'},createdAt:now,updatedAt:now},{id:cmsId(),type:'richtext',label:'سياسة الخصوصية',enabled:true,order:1,data:{title:'سياسة الخصوصية — Privacy Policy',icon:'🔒',body:'آخر تحديث: 2026-03-22\n\n**1. المقدمة**\nSAAD STUDIO ملتزمة بحماية خصوصيتك. توضح هذه السياسة كيف نجمع ونستخدم ونكشف ونحمي معلوماتك.\n\n**2. المعلومات التي نجمعها**\n• معلومات الحساب: الاسم، البريد الإلكتروني، بيانات المصادقة.\n• الدفع: فواتير عبر معالجات آمنة — لا نخزن أرقام البطاقات الكاملة.\n• المحتوى: الصور والأوامر (prompts) والملفات المُحمَّلة.\n• تلقائي: بيانات الاستخدام، معلومات الجهاز، عنوان IP، كوكيز الجلسة (بدون كوكيز إعلانية).\n\n**3. كيف نستخدم المعلومات**\n• توفير وصيانة وتحسين المنصة.\n• معالجة المعاملات وإدارة الاشتراكات.\n• تطبيق الشروط وكشف الاحتيال.\n• الامتثال للمتطلبات القانونية.\n\n**4. معالجة AI**\nتُعالج الأوامر بواسطة مزودي AI خارجيين. يُخزن المحتوى المولّد في معرضك الشخصي.\nلا نستخدم بياناتك لتدريب نماذج AI بدون موافقتك الصريحة.\n\n**5. مشاركة البيانات**\nلا نبيع معلوماتك الشخصية أبداً.\n• مزودو AI الخارجيون: فقط البيانات اللازمة للمعالجة.\n• معالجات الدفع: للمعاملات الآمنة فقط.\n• السلطات القانونية: عند الطلب بموجب القانون النافذ.\n\n**6. الأمان**\n• تشفير TLS/SSL أثناء النقل والتخزين.\n• كوكيز HttpOnly وحماية CSRF.\n• تدقيقات أمنية دورية وضوابط وصول صارمة.\n\n**7. حقوقك**\n• الوصول: طلب نسخة من بياناتك الشخصية.\n• التصحيح: تصحيح المعلومات غير الدقيقة أو غير المكتملة.\n• الحذف: طلب حذف بياناتك من أنظمتنا.\n• النقل: الحصول على بياناتك بتنسيق منظم وقابل للقراءة آلياً.\n\nتواصل: support@saadstudio.com — الرد خلال 30 يوماً.\n\n**8. الأطفال**\nالمنصة غير مخصصة لمن هم دون 18 عاماً. لا نجمع بيانات الأطفال عمداً. إذا اكتُشف ذلك، سنحذفها فوراً.\n\n© 2025 SAAD STUDIO. جميع الحقوق محفوظة.'},createdAt:now,updatedAt:now},{id:cmsId(),type:'richtext',label:'سياسة الاسترداد',enabled:true,order:2,data:{title:'نظام الرصيد والدفع — Credits & Payment',icon:'💳',body:'آخر تحديث: 2026-03-22\n\n**4.1 كيف يعمل نظام الرصيد**\nالرصيد هو العملة الافتراضية في المنصة. يتم شراؤه عبر خطط اشتراك شهرية أو حزم شحن.\n\nخطط الاشتراك الشهرية:\n• Starter — $10/شهر — 1,000 كريدت\n• Pro — $25/شهر — 2,800 كريدت\n• Creator — $50/شهر — 6,000 كريدت\n\nحزم الشحن (لا تنتهي حتى الاستخدام أو إنهاء الحساب):\n• $5 = 450 كريدت\n• $15 = 1,500 كريدت\n• $30 = 3,200 كريدت\n• $50 = 5,500 كريدت\n\n**4.2 كيف يُستهلك الرصيد**\n• عند الضغط على "Generate" يُخصم الرصيد فوراً من رصيدك.\n• تكلفة الرصيد الدقيقة تظهر قبل تأكيد التوليد — لديك دائماً فرصة المراجعة والقرار.\n• النماذج المختلفة لها تكاليف مختلفة. طلبك يُرسل لمزود AI خارجي يحاسبنا فورياً.\n\nأمثلة التكاليف:\n• Nano Banana Image = 4 كريدت (~$0.04)\n• Qwen2 Image = 6 كريدت (~$0.06)\n• Kling Std 5s Video (بدون صوت) = 70 كريدت (~$0.70)\n• Kling Pro 10s + صوت = 270 كريدت (~$2.70)\n• Hailuo 6s Video = 57 كريدت (~$0.57)\n• Sora 2 Basic 10s Video = 30 كريدت (~$0.30)\n• Suno Music Track = 10 كريدت (~$0.10)\n• Veo 3.1 Fast Video = 50 كريدت (~$0.50)\n\n**4.3 لماذا الرصيد غير قابل للاسترداد**\nكل عملية توليد تتحمل تكاليف حقيقية تُدفع فوراً لمزودي AI الخارجيين (KIE.AI، Google، OpenAI وغيرهم) لحظة المعالجة. هذه التكاليف تُحاسبنا فورياً ولا يمكن عكسها. تكلفة الرصيد تُعرض بوضوح قبل التأكيد. جودة مخرجات AI متغيرة بطبيعتها وليست فشلاً في الخدمة. ننصح باختبار الأوامر بنماذج أقل تكلفة قبل استخدام النماذج المتقدمة.\n\n**4.4 حالات استرداد الرصيد**\n• خطأ نظام: إذا فشلت المنصة في تقديم أي مخرجات بسبب خطأ في السيرفر (وليس قيود النموذج).\n• خصم مزدوج: إذا خُصم الرصيد عدة مرات لتوليد واحد بسبب خلل تقني.\n• انقطاع الخدمة: إذا فُقد طلب توليد مدفوع بسبب انقطاع شامل في المنصة.\n\nلطلب الاسترداد: تواصل عبر support@saadstudio.com مع معرّف التوليد والتفاصيل. سنراجع ونرد خلال 7 أيام عمل.\n\n**4.5 الاشتراكات والفوترة**\n• تتجدد الاشتراكات تلقائياً كل شهر. يمكن الإلغاء في أي وقت — يسري في نهاية فترة الفوترة الحالية.\n• رصيد الاشتراك غير المستخدم لا يُنقل للشهر التالي. رصيد الشحن يبقى حتى الاستخدام.\n• قد تتغير الأسعار مع إشعار مسبق بـ 30 يوماً على الأقل. سيُبلغ المشتركون عبر البريد الإلكتروني.'},createdAt:now,updatedAt:now}],createdAt:now,updatedAt:now}];changed=true;console.log('  ✅ CMS: تم إنشاء الصفحات الافتراضية');}// Always ensure legal page exists even if other pages were already seeded
if(Array.isArray(cms.pages)&&!cms.pages.find(p=>p.slug==='legal')){const now=new Date().toISOString();cms.pages.push({id:cmsId(),title:'Legal',slug:'legal',category:'legal',visible:true,published:true,order:10,seoTitle:'الشروط والأحكام - SAAD STUDIO',seoDescription:'شروط الاستخدام وسياسة الخصوصية وسياسة الاسترداد',sections:[{id:cmsId(),type:'richtext',label:'شروط الاستخدام',enabled:true,order:0,data:{title:'شروط الخدمة — Terms of Service',icon:'📋',body:'آخر تحديث: 2026-03-22\n\n**1. قبول الشروط**\nباستخدامك أو وصولك إلى SAAD STUDIO ("المنصة") بما في ذلك جميع المواقع والتطبيقات وواجهات API، فإنك توافق على الالتزام بشروط الخدمة هذه. إذا لم توافق، يجب عدم استخدام المنصة. تشكل هذه الشروط اتفاقية ملزمة قانونياً بينك ("المستخدم") وSAAD STUDIO. نحتفظ بحق تعديل الشروط في أي وقت. استمرارك يعني قبولك.\n\n**2. الأهلية**\n• يجب أن يكون عمرك 18 عاماً على الأقل.\n• يجب تقديم معلومات تسجيل دقيقة وكاملة.\n• أنت مسؤول عن أمان حسابك وجميع الأنشطة تحته.\n\n**3. وصف الخدمات**\nSAAD STUDIO منصة إبداعية سحابية لتوليد الصور والفيديو والموسيقى والنصوص باستخدام نماذج AI متعددة من مزودين خارجيين.\n\n**5. سياسة الاستخدام المقبول**\nتوافق على عدم استخدام المنصة لـ:\n• توليد محتوى غير قانوني أو ضار أو مسيء أو تشهيري.\n• إنشاء مواد استغلال الأطفال (CSAM).\n• توليد صور مزيفة غير رضائية لأشخاص حقيقيين.\n• انتحال شخصيات أو كيانات.\n• انتهاك الملكية الفكرية أو العلامات التجارية أو حقوق النشر.\n• الهندسة العكسية أو تجاوز الأمان.\n• توليد رسائل مزعجة أو برمجيات خبيثة أو تصيد.\n• بناء خدمات AI منافسة باستخدام منصتنا.\n\n**6. ملكية المحتوى**\nتحميلاتك (المدخلات): تحتفظ بملكيتها وتمنحنا ترخيصاً محدوداً للمعالجة. المحتوى المولّد (المخرجات): تملكه بموجب الشروط، لا ضمان للتفرد. الملكية الفكرية للمنصة (التصميم، الكود، العلامات التجارية) تبقى لنا.\n\n**7. إخلاء مسؤولية AI**\nقد يحتوي محتوى AI على أخطاء أو تحيزات أو اتجاهات. المخرجات لا تمثل آراءنا. أنت المسؤول الوحيد عن مراجعة المخرجات. لا تقدمها على أنها بشرية عندما يكون الإفصاح مطلوباً.\n\n**8. المسؤولية والإنهاء**\nالمنصة تُقدم "كما هي". لسنا مسؤولين عن أضرار غير مباشرة. المسؤولية الإجمالية محدودة برسوم 12 شهراً مدفوعة. يجوز الإنهاء للمخالفات أو مخاطر أمنية أو متطلبات قانونية أو عدم النشاط 12+ شهراً. توافق على تعويض SAAD STUDIO من مطالبات ناتجة عن استخدامك.\n\nللتواصل: support@saadstudio.com'},createdAt:now,updatedAt:now},{id:cmsId(),type:'richtext',label:'سياسة الخصوصية',enabled:true,order:1,data:{title:'سياسة الخصوصية — Privacy Policy',icon:'🔒',body:'آخر تحديث: 2026-03-22\n\n**1. المقدمة**\nSAAD STUDIO ملتزمة بحماية خصوصيتك. توضح هذه السياسة كيف نجمع ونستخدم ونكشف ونحمي معلوماتك.\n\n**2. المعلومات التي نجمعها**\n• معلومات الحساب: الاسم، البريد الإلكتروني، بيانات المصادقة.\n• الدفع: فواتير عبر معالجات آمنة — لا نخزن أرقام البطاقات الكاملة.\n• المحتوى: الصور والأوامر (prompts) والملفات المُحمَّلة.\n• تلقائي: بيانات الاستخدام، معلومات الجهاز، عنوان IP، كوكيز الجلسة (بدون كوكيز إعلانية).\n\n**3. كيف نستخدم المعلومات**\n• توفير وصيانة وتحسين المنصة.\n• معالجة المعاملات وإدارة الاشتراكات.\n• تطبيق الشروط وكشف الاحتيال.\n• الامتثال للمتطلبات القانونية.\n\n**4. معالجة AI**\nتُعالج الأوامر بواسطة مزودي AI خارجيين. يُخزن المحتوى المولّد في معرضك الشخصي.\nلا نستخدم بياناتك لتدريب نماذج AI بدون موافقتك الصريحة.\n\n**5. مشاركة البيانات**\nلا نبيع معلوماتك الشخصية أبداً.\n• مزودو AI الخارجيون: فقط البيانات اللازمة للمعالجة.\n• معالجات الدفع: للمعاملات الآمنة فقط.\n• السلطات القانونية: عند الطلب بموجب القانون النافذ.\n\n**6. الأمان**\n• تشفير TLS/SSL أثناء النقل والتخزين.\n• كوكيز HttpOnly وحماية CSRF.\n• تدقيقات أمنية دورية وضوابط وصول صارمة.\n\n**7. حقوقك**\n• الوصول: طلب نسخة من بياناتك الشخصية.\n• التصحيح: تصحيح المعلومات غير الدقيقة أو غير المكتملة.\n• الحذف: طلب حذف بياناتك من أنظمتنا.\n• النقل: الحصول على بياناتك بتنسيق منظم وقابل للقراءة آلياً.\n\nتواصل: support@saadstudio.com — الرد خلال 30 يوماً.\n\n**8. الأطفال**\nالمنصة غير مخصصة لمن هم دون 18 عاماً. لا نجمع بيانات الأطفال عمداً. إذا اكتُشف ذلك، سنحذفها فوراً.\n\n© 2025 SAAD STUDIO. جميع الحقوق محفوظة.'},createdAt:now,updatedAt:now},{id:cmsId(),type:'richtext',label:'سياسة الاسترداد',enabled:true,order:2,data:{title:'نظام الرصيد والدفع — Credits & Payment',icon:'💳',body:'آخر تحديث: 2026-03-22\n\n**4.1 كيف يعمل نظام الرصيد**\nالرصيد هو العملة الافتراضية في المنصة. يتم شراؤه عبر خطط اشتراك شهرية أو حزم شحن.\n\nخطط الاشتراك الشهرية:\n• Starter — $10/شهر — 1,000 كريدت\n• Pro — $25/شهر — 2,800 كريدت\n• Creator — $50/شهر — 6,000 كريدت\n\nحزم الشحن (لا تنتهي حتى الاستخدام أو إنهاء الحساب):\n• $5 = 450 كريدت\n• $15 = 1,500 كريدت\n• $30 = 3,200 كريدت\n• $50 = 5,500 كريدت\n\n**4.2 كيف يُستهلك الرصيد**\n• عند الضغط على "Generate" يُخصم الرصيد فوراً من رصيدك.\n• تكلفة الرصيد الدقيقة تظهر قبل تأكيد التوليد — لديك دائماً فرصة المراجعة والقرار.\n• النماذج المختلفة لها تكاليف مختلفة. طلبك يُرسل لمزود AI خارجي يحاسبنا فورياً.\n\nأمثلة التكاليف:\n• Nano Banana Image = 4 كريدت (~$0.04)\n• Qwen2 Image = 6 كريدت (~$0.06)\n• Kling Std 5s Video (بدون صوت) = 70 كريدت (~$0.70)\n• Kling Pro 10s + صوت = 270 كريدت (~$2.70)\n• Hailuo 6s Video = 57 كريدت (~$0.57)\n• Sora 2 Basic 10s Video = 30 كريدت (~$0.30)\n• Suno Music Track = 10 كريدت (~$0.10)\n• Veo 3.1 Fast Video = 50 كريدت (~$0.50)\n\n**4.3 لماذا الرصيد غير قابل للاسترداد**\nكل عملية توليد تتحمل تكاليف حقيقية تُدفع فوراً لمزودي AI الخارجيين (KIE.AI، Google، OpenAI وغيرهم) لحظة المعالجة. هذه التكاليف تُحاسبنا فورياً ولا يمكن عكسها. تكلفة الرصيد تُعرض بوضوح قبل التأكيد. جودة مخرجات AI متغيرة بطبيعتها وليست فشلاً في الخدمة. ننصح باختبار الأوامر بنماذج أقل تكلفة قبل استخدام النماذج المتقدمة.\n\n**4.4 حالات استرداد الرصيد**\n• خطأ نظام: إذا فشلت المنصة في تقديم أي مخرجات بسبب خطأ في السيرفر (وليس قيود النموذج).\n• خصم مزدوج: إذا خُصم الرصيد عدة مرات لتوليد واحد بسبب خلل تقني.\n• انقطاع الخدمة: إذا فُقد طلب توليد مدفوع بسبب انقطاع شامل في المنصة.\n\nلطلب الاسترداد: تواصل عبر support@saadstudio.com مع معرّف التوليد والتفاصيل. سنراجع ونرد خلال 7 أيام عمل.\n\n**4.5 الاشتراكات والفوترة**\n• تتجدد الاشتراكات تلقائياً كل شهر. يمكن الإلغاء في أي وقت — يسري في نهاية فترة الفوترة الحالية.\n• رصيد الاشتراك غير المستخدم لا يُنقل للشهر التالي. رصيد الشحن يبقى حتى الاستخدام.\n• قد تتغير الأسعار مع إشعار مسبق بـ 30 يوماً على الأقل. سيُبلغ المشتركون عبر البريد الإلكتروني.'},createdAt:now,updatedAt:now}],createdAt:now,updatedAt:now});changed=true;console.log('  ✅ CMS: تمت إضافة صفحة Legal');}
if(!Array.isArray(cms.sidebar)||!cms.sidebar.length){const now=new Date().toISOString();const si=(pageId,title,group,icon,iconType,iconImg,order,opts={})=>({id:cmsId(),pageId,title,group,icon,iconType,iconImg,order,visible:opts.visible!==false,enabled:opts.enabled!==false,badge:opts.badge||null,external:opts.external||false,externalUrl:opts.externalUrl||'',featured:opts.featured||false,isNew:opts.isNew||false,isPro:opts.isPro||false,createdAt:now,updatedAt:now});cms.sidebar=[si('dash','Discover','Main','','img','/assets/logo-saad.png',0),si('image-tools','Image Tools','Production','','img','/assets/logo-image-tools.png',1),si('transitions','Transitions','Production','🎞️','emoji','',2),si('nano','Nano Banana','Production','🍌','emoji','',3),si('google','Google Studio','Production','','img','/assets/logo-google-studio.png',4),si('kling','Kling Studio','Production','','img','/assets/logo-kling-studio.png',5),si('eleven','ElevenLabs Studio','Production','','img','/assets/logo-elevenlabs-studio.png',6),si('cinema','Cinema Studio','Production','🎬','emoji','',7),si('prompt','Prompt Studio','Production','🔍','emoji','',8),si('sora2','Sora 2','Models','','img','/assets/logo-sora-2.png',9),si('gpt54','GPT-5.2','Models','','img','/assets/logo-gpt-52.png',10),si('hailuo','Hailuo','Models','','img','/assets/logo-hailuo.png',11),si('grok','Grok','Models','','img','/assets/logo-grok.png',12),si('seedream45','Seedream 4.5','Models','','img','/assets/logo-seedream-45.png',13),si('flux2','FLUX.2','Models','','img','/assets/logo-flux-2.png',14),si('zimage','Z-Image','Models','','img','/assets/logo-z-image.png',15),si('wan26','Wan 2.6','Models','','img','/assets/logo-wan-26.png',16),si('seedance15','Seedance 1.5','Models','','img','/assets/logo-seedance-15-pro.png',17),si('fluxkontext','Flux Kontext','Models','','img','/assets/logo-flux-kontext.png',18),si('ideogram-reframe','Ideogram Reframe','Models','','img','/assets/logo-ideogram-reframe.png',19),si('infinitalk','Infinitalk','Models','','img','/assets/logo-infinitalk.png',20),si('qwen2','Qwen2','Models','','img','/assets/logo-qwen2.png',21),si('model','Ideogram Character','Models','','img','/assets/logo-ideogram-character.png',22),si('gallery','Gallery','Library','🗄️','emoji','',23),si('library','Library','Library','📁','emoji','',24),si('control','Control Panel','System','⚙️','emoji','',25,{visible:false}),si('nav-dashboard','Dashboard','System','📊','emoji','',26,{visible:false,external:true,externalUrl:'/dashboard.html'})];changed=true;console.log('  ✅ CMS: تم إنشاء عناصر القائمة الجانبية');}if(changed)await saveCMS(cms);}catch(e){console.error('CMS seed error',e.message);}}

ensureCMSSeed();

// Public CMS API (no auth - read-only published data for frontend)
app.get('/api/cms/pages',async(req,res)=>{try{const cms=await loadCMS();const pages=(cms.pages||[]).filter(p=>p.published&&p.visible!==false).map(p=>({id:p.id,title:p.title,slug:p.slug,category:p.category,seoTitle:p.seoTitle,seoDescription:p.seoDescription,sections:(p.sections||[]).filter(s=>s.enabled!==false).sort((a,b)=>(a.order||0)-(b.order||0))})).sort((a,b)=>(a.order||0)-(b.order||0));res.json({pages});}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/cms/pages/:slug',async(req,res)=>{try{const cms=await loadCMS();const slug=String(req.params.slug||'').toLowerCase().trim();const page=(cms.pages||[]).find(p=>p.slug===slug&&p.published&&p.visible!==false);if(!page)return res.status(404).json({error:'الصفحة غير موجودة'});const promoBars=(cms.promoBars||[]).filter(b=>b.enabled&&(b.pages==='all'||b.pages==='*'||(Array.isArray(b.pages)&&(b.pages.includes(slug)||b.pages.includes('all')))));res.json({id:page.id,title:page.title,slug:page.slug,seoTitle:page.seoTitle,seoDescription:page.seoDescription,sections:(page.sections||[]).filter(s=>s.enabled!==false).sort((a,b)=>(a.order||0)-(b.order||0)),promoBars:promoBars.sort((a,b)=>(a.order||0)-(b.order||0)),settings:{siteTitle:(cms.settings||{}).siteTitle,logo:(cms.settings||{}).logo}});}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/cms/settings',async(req,res)=>{try{const cms=await loadCMS();const s=cms.settings||{};res.json({siteTitle:s.siteTitle,siteDescription:s.siteDescription,logo:s.logo,favicon:s.favicon,seoTitle:s.seoTitle,seoDescription:s.seoDescription,maintenanceMode:s.maintenanceMode,maintenanceMessage:s.maintenanceMessage,socialLinks:s.socialLinks||{},analytics:s.analytics||{}});}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/cms/nav',async(req,res)=>{try{const cms=await loadCMS();res.json({navigation:cms.navigation||{header:[],footer:[]}});}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/cms/promobars',async(req,res)=>{try{const cms=await loadCMS();const slug=req.query.slug||'';const bars=(cms.promoBars||[]).filter(b=>b.enabled&&(b.pages==='all'||b.pages==='*'||(Array.isArray(b.pages)&&(b.pages.includes(slug)||b.pages.includes('all')))));res.json({bars:bars.sort((a,b)=>(a.order||0)-(b.order||0))});}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/cms/sidebar',async(req,res)=>{try{const cms=await loadCMS();const items=(cms.sidebar||[]).filter(i=>i.visible!==false&&i.enabled!==false).sort((a,b)=>(a.order||0)-(b.order||0));res.json({sidebar:items});}catch(e){res.status(500).json({error:e.message});}});

// Pages
app.get('/api/admin/cms/pages',requireAdmin,async(req,res)=>{try{const cms=await loadCMS();res.json({pages:cms.pages||[]});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/admin/cms/pages',requireAdmin,cmsWriteLimiter,async(req,res)=>{try{const p=validatePageBody(req.body);if(p.error)return res.status(400).json({error:p.error});const cms=await loadCMS();if(cms.pages.some(existing=>existing.slug===p.slug))return res.status(409).json({error:'slug already exists'});const page={id:cmsId(),...p,sections:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};cms.pages.push(page);cmsLog(cms,'page.create',`صفحة جديدة: "${page.title}"`);auditLog('cms.page.create','title="'+page.title+'" slug="'+page.slug+'"',req);await saveCMS(cms);res.json({ok:true,page});}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/admin/cms/pages/:id',requireAdmin,cmsWriteLimiter,async(req,res)=>{try{const cms=await loadCMS();const idx=cms.pages.findIndex(p=>p.id===req.params.id);if(idx===-1)return res.status(404).json({error:'الصفحة غير موجودة'});const p=validatePageBody({...cms.pages[idx],...req.body});if(p.error)return res.status(400).json({error:p.error});if(cms.pages.some((existing,i)=>i!==idx&&existing.slug===p.slug))return res.status(409).json({error:'slug already exists'});cms.pages[idx]={...cms.pages[idx],...p,id:cms.pages[idx].id,sections:cms.pages[idx].sections,createdAt:cms.pages[idx].createdAt,updatedAt:new Date().toISOString()};cmsLog(cms,'page.update',`تحديث: "${p.title}"`);auditLog('cms.page.update','id="'+req.params.id+'" title="'+p.title+'"',req);await saveCMS(cms);res.json({ok:true,page:cms.pages[idx]});}catch(e){res.status(500).json({error:e.message});}});
app.delete('/api/admin/cms/pages/:id',requireAdmin,cmsWriteLimiter,async(req,res)=>{try{const cms=await loadCMS();const idx=cms.pages.findIndex(p=>p.id===req.params.id);if(idx===-1)return res.status(404).json({error:'الصفحة غير موجودة'});const[rem]=cms.pages.splice(idx,1);cmsLog(cms,'page.delete',`حذف: "${rem.title}"`);auditLog('cms.page.delete','title="'+rem.title+'"',req);await saveCMS(cms);res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/admin/cms/pages/:id/duplicate',requireAdmin,async(req,res)=>{try{const cms=await loadCMS();const src=cms.pages.find(p=>p.id===req.params.id);if(!src)return res.status(404).json({error:'الصفحة غير موجودة'});const copy=JSON.parse(JSON.stringify(src));copy.id=cmsId();copy.title=copy.title+' (نسخة)';copy.slug=copy.slug+'-copy-'+Date.now();copy.published=false;copy.createdAt=copy.updatedAt=new Date().toISOString();copy.sections=(copy.sections||[]).map(s=>({...s,id:cmsId()}));cms.pages.push(copy);cmsLog(cms,'page.duplicate',`نسخ "${src.title}"`);await saveCMS(cms);res.json({ok:true,page:copy});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/admin/cms/pages/reorder',requireAdmin,async(req,res)=>{try{const ids=req.body.ids;if(!Array.isArray(ids))return res.status(400).json({error:'ids[] required'});const cms=await loadCMS();const map=Object.fromEntries(cms.pages.map(p=>[p.id,p]));const reordered=ids.filter(id=>map[id]).map((id,i)=>({...map[id],order:i}));const included=new Set(ids);cms.pages=[...reordered,...cms.pages.filter(p=>!included.has(p.id))];cmsLog(cms,'page.reorder',`ترتيب ${reordered.length} صفحة`);await saveCMS(cms);res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

// Sections
app.get('/api/admin/cms/pages/:pageId/sections',requireAdmin,async(req,res)=>{try{const cms=await loadCMS();const page=cms.pages.find(p=>p.id===req.params.pageId);if(!page)return res.status(404).json({error:'الصفحة غير موجودة'});res.json({sections:page.sections||[]});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/admin/cms/pages/:pageId/sections',requireAdmin,cmsWriteLimiter,async(req,res)=>{try{const type=sStr(req.body.type,50)||'custom';const label=sStr(req.body.label,200)||type;const cms=await loadCMS();const page=cms.pages.find(p=>p.id===req.params.pageId);if(!page)return res.status(404).json({error:'الصفحة غير موجودة'});if(!Array.isArray(page.sections))page.sections=[];const section={id:cmsId(),type,label,enabled:true,order:page.sections.length,data:req.body.data||{},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};page.sections.push(section);page.updatedAt=new Date().toISOString();cmsLog(cms,'section.create',`قسم "${label}" في "${page.title}"`);await saveCMS(cms);res.json({ok:true,section});}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/admin/cms/pages/:pageId/sections/:sId',requireAdmin,cmsWriteLimiter,async(req,res)=>{try{const cms=await loadCMS();const page=cms.pages.find(p=>p.id===req.params.pageId);if(!page)return res.status(404).json({error:'الصفحة غير موجودة'});const idx=(page.sections||[]).findIndex(s=>s.id===req.params.sId);if(idx===-1)return res.status(404).json({error:'القسم غير موجود'});const s=page.sections[idx];page.sections[idx]={...s,label:req.body.label!==undefined?sStr(req.body.label,200):s.label,enabled:req.body.enabled!==undefined?Boolean(req.body.enabled):s.enabled,data:req.body.data!==undefined?req.body.data:s.data,order:req.body.order!==undefined?Number(req.body.order):s.order,updatedAt:new Date().toISOString()};page.updatedAt=new Date().toISOString();cmsLog(cms,'section.update',`تحديث "${page.sections[idx].label}"`);await saveCMS(cms);res.json({ok:true,section:page.sections[idx]});}catch(e){res.status(500).json({error:e.message});}});
app.delete('/api/admin/cms/pages/:pageId/sections/:sId',requireAdmin,cmsWriteLimiter,async(req,res)=>{try{const cms=await loadCMS();const page=cms.pages.find(p=>p.id===req.params.pageId);if(!page)return res.status(404).json({error:'الصفحة غير موجودة'});const idx=(page.sections||[]).findIndex(s=>s.id===req.params.sId);if(idx===-1)return res.status(404).json({error:'القسم غير موجود'});const[rem]=page.sections.splice(idx,1);page.updatedAt=new Date().toISOString();cmsLog(cms,'section.delete',`حذف "${rem.label}" من "${page.title}"`);await saveCMS(cms);res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/admin/cms/pages/:pageId/sections/reorder',requireAdmin,async(req,res)=>{try{const ids=req.body.ids;if(!Array.isArray(ids))return res.status(400).json({error:'ids[] required'});const cms=await loadCMS();const page=cms.pages.find(p=>p.id===req.params.pageId);if(!page)return res.status(404).json({error:'الصفحة غير موجودة'});const map=Object.fromEntries((page.sections||[]).map(s=>[s.id,s]));page.sections=ids.filter(id=>map[id]).map((id,i)=>({...map[id],order:i}));page.updatedAt=new Date().toISOString();cmsLog(cms,'section.reorder',`ترتيب أقسام "${page.title}"`);await saveCMS(cms);res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

// Navigation
app.get('/api/admin/cms/nav',requireAdmin,async(req,res)=>{try{const cms=await loadCMS();res.json({navigation:cms.navigation||{header:[],footer:[]}});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/admin/cms/nav/:menu',requireAdmin,async(req,res)=>{try{const menu=req.params.menu;if(!['header','footer'].includes(menu))return res.status(400).json({error:'Invalid menu'});const label=sStr(req.body.label,100);const href=sStr(req.body.href,500);if(!label||!href)return res.status(400).json({error:'label and href required'});const cms=await loadCMS();if(!cms.navigation)cms.navigation={header:[],footer:[]};if(!Array.isArray(cms.navigation[menu]))cms.navigation[menu]=[];const item={id:cmsId(),label,href,target:req.body.target==='_blank'?'_blank':'_self',order:cms.navigation[menu].length};cms.navigation[menu].push(item);cmsLog(cms,'nav.add',`إضافة "${label}"  ${menu}`);await saveCMS(cms);res.json({ok:true,item});}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/admin/cms/nav/:menu/:id',requireAdmin,async(req,res)=>{try{const menu=req.params.menu;if(!['header','footer'].includes(menu))return res.status(400).json({error:'Invalid menu'});const cms=await loadCMS();if(!cms.navigation?.[menu])return res.status(404).json({error:'القائمة غير موجودة'});const item=cms.navigation[menu].find(i=>i.id===req.params.id);if(!item)return res.status(404).json({error:'العنصر غير موجود'});if(req.body.label!==undefined)item.label=sStr(req.body.label,100);if(req.body.href!==undefined)item.href=sStr(req.body.href,500);if(req.body.target!==undefined)item.target=req.body.target==='_blank'?'_blank':'_self';cmsLog(cms,'nav.update',`تحديث "${item.label}" في ${menu}`);await saveCMS(cms);res.json({ok:true,item});}catch(e){res.status(500).json({error:e.message});}});
app.delete('/api/admin/cms/nav/:menu/:id',requireAdmin,async(req,res)=>{try{const menu=req.params.menu;if(!['header','footer'].includes(menu))return res.status(400).json({error:'Invalid menu'});const cms=await loadCMS();if(!cms.navigation?.[menu])return res.status(404).json({error:'القائمة غير موجودة'});const idx=cms.navigation[menu].findIndex(i=>i.id===req.params.id);if(idx===-1)return res.status(404).json({error:'العنصر غير موجود'});const[rem]=cms.navigation[menu].splice(idx,1);cmsLog(cms,'nav.delete',`حذف "${rem.label}" من ${menu}`);await saveCMS(cms);res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/admin/cms/nav/:menu/reorder',requireAdmin,async(req,res)=>{try{const menu=req.params.menu;if(!['header','footer'].includes(menu))return res.status(400).json({error:'Invalid menu'});const ids=req.body.ids;if(!Array.isArray(ids))return res.status(400).json({error:'ids[] required'});const cms=await loadCMS();if(!cms.navigation?.[menu])return res.status(404).json({error:'القائمة غير موجودة'});const map=Object.fromEntries(cms.navigation[menu].map(i=>[i.id,i]));cms.navigation[menu]=ids.filter(id=>map[id]).map((id,i)=>({...map[id],order:i}));cmsLog(cms,'nav.reorder',`ترتيب ${menu}`);await saveCMS(cms);res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

// Settings
app.get('/api/admin/cms/settings',requireAdmin,async(req,res)=>{try{const cms=await loadCMS();res.json({settings:cms.settings||{}});}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/admin/cms/settings',requireAdmin,cmsWriteLimiter,async(req,res)=>{try{const cms=await loadCMS();const s=cms.settings||{};const b=req.body;for(const k of['siteTitle','siteDescription','logo','favicon','seoTitle','seoDescription','contactEmail','contactPhone','maintenanceMessage']){if(b[k]!==undefined)s[k]=sStr(b[k],500);}if(b.socialLinks&&typeof b.socialLinks==='object'){s.socialLinks=s.socialLinks||{};for(const k of['twitter','instagram','youtube','tiktok']){if(b.socialLinks[k]!==undefined)s.socialLinks[k]=sStr(b.socialLinks[k],300);}}if(b.analytics&&typeof b.analytics==='object'){s.analytics=s.analytics||{};for(const k of['googleTagId','facebookPixelId']){if(b.analytics[k]!==undefined)s.analytics[k]=sStr(b.analytics[k],100);}}if(b.maintenanceMode!==undefined)s.maintenanceMode=Boolean(b.maintenanceMode);cms.settings=s;cmsLog(cms,'settings.update','تحديث إعدادات الموقع');await saveCMS(cms);res.json({ok:true,settings:s});}catch(e){res.status(500).json({error:e.message});}});

// Audit
app.get('/api/admin/cms/audit',requireAdmin,async(req,res)=>{try{const cms=await loadCMS();res.json({auditLog:(cms.auditLog||[]).slice(0,100)});}catch(e){res.status(500).json({error:e.message});}});

// Promo Bars (admin)
app.get('/api/admin/cms/promobars',requireAdmin,async(req,res)=>{try{const cms=await loadCMS();res.json({bars:cms.promoBars||[]});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/admin/cms/promobars',requireAdmin,async(req,res)=>{try{const b=req.body;const bar={id:cmsId(),enabled:b.enabled!==false,text:sStr(b.text,500),subtext:sStr(b.subtext,500),buttonText:sStr(b.buttonText,200),buttonLink:sStr(b.buttonLink,500),bgColor:sStr(b.bgColor,50)||'#1a3a6c',textColor:sStr(b.textColor,50)||'#ffffff',height:sStr(b.height,30)||'44px',align:['left','center','right'].includes(b.align)?b.align:'center',fixed:Boolean(b.fixed),placement:sStr(b.placement,50)||'above-main-content',pages:Array.isArray(b.pages)?b.pages:['all'],gradientStart:sStr(b.gradientStart||'',30),gradientEnd:sStr(b.gradientEnd||'',30),subtextColor:sStr(b.subtextColor||'',80),btnBgColor:sStr(b.btnBgColor||'',80),btnTextColor:sStr(b.btnTextColor||'',30),btnBorderColor:sStr(b.btnBorderColor||'',80),mainFontSize:sStr(b.mainFontSize||'',20),mainFontWeight:sStr(b.mainFontWeight||'',10),subtextFontSize:sStr(b.subtextFontSize||'',20),subtextFontWeight:sStr(b.subtextFontWeight||'',10),btnFontSize:sStr(b.btnFontSize||'',20),btnFontWeight:sStr(b.btnFontWeight||'',10),lineHeight:sStr(b.lineHeight||'',20),letterSpacing:sStr(b.letterSpacing||'',30),paddingY:sStr(b.paddingY||'',20),paddingX:sStr(b.paddingX||'',20),borderRadius:sStr(b.borderRadius||'',20),borderColor:sStr(b.borderColor||'',80),borderWidth:sStr(b.borderWidth||'',20),shadowEnabled:Boolean(b.shadowEnabled),glowEnabled:Boolean(b.glowEnabled),glassEffect:Boolean(b.glassEffect),fullWidth:Boolean(b.fullWidth),showDesktop:b.showDesktop!==false,showMobile:b.showMobile!==false,order:Number(b.order)||0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};const cms=await loadCMS();if(!Array.isArray(cms.promoBars))cms.promoBars=[];cms.promoBars.push(bar);cmsLog(cms,'promobar.create',`شريط ترويجي: "${bar.text.slice(0,40)}"`);await saveCMS(cms);res.json({ok:true,bar});}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/admin/cms/promobars/:id',requireAdmin,async(req,res)=>{try{const cms=await loadCMS();if(!Array.isArray(cms.promoBars))cms.promoBars=[];const idx=cms.promoBars.findIndex(b=>b.id===req.params.id);if(idx===-1)return res.status(404).json({error:'الشريط غير موجود'});const b=req.body;const prev=cms.promoBars[idx];cms.promoBars[idx]={...prev,enabled:b.enabled!==undefined?Boolean(b.enabled):prev.enabled,text:b.text!==undefined?sStr(b.text,500):prev.text,subtext:b.subtext!==undefined?sStr(b.subtext,500):prev.subtext,buttonText:b.buttonText!==undefined?sStr(b.buttonText,200):prev.buttonText,buttonLink:b.buttonLink!==undefined?sStr(b.buttonLink,500):prev.buttonLink,bgColor:b.bgColor!==undefined?sStr(b.bgColor,50):prev.bgColor,textColor:b.textColor!==undefined?sStr(b.textColor,50):prev.textColor,height:b.height!==undefined?sStr(b.height,30):prev.height,align:b.align!==undefined?b.align:prev.align,fixed:b.fixed!==undefined?Boolean(b.fixed):prev.fixed,placement:b.placement!==undefined?sStr(b.placement,50):prev.placement,pages:b.pages!==undefined?(Array.isArray(b.pages)?b.pages:['all']):prev.pages,order:b.order!==undefined?Number(b.order):prev.order,gradientStart:b.gradientStart!==undefined?sStr(b.gradientStart,30):prev.gradientStart,gradientEnd:b.gradientEnd!==undefined?sStr(b.gradientEnd,30):prev.gradientEnd,subtextColor:b.subtextColor!==undefined?sStr(b.subtextColor,80):prev.subtextColor,btnBgColor:b.btnBgColor!==undefined?sStr(b.btnBgColor,80):prev.btnBgColor,btnTextColor:b.btnTextColor!==undefined?sStr(b.btnTextColor,30):prev.btnTextColor,btnBorderColor:b.btnBorderColor!==undefined?sStr(b.btnBorderColor,80):prev.btnBorderColor,mainFontSize:b.mainFontSize!==undefined?sStr(b.mainFontSize,20):prev.mainFontSize,mainFontWeight:b.mainFontWeight!==undefined?sStr(b.mainFontWeight,10):prev.mainFontWeight,subtextFontSize:b.subtextFontSize!==undefined?sStr(b.subtextFontSize,20):prev.subtextFontSize,subtextFontWeight:b.subtextFontWeight!==undefined?sStr(b.subtextFontWeight,10):prev.subtextFontWeight,btnFontSize:b.btnFontSize!==undefined?sStr(b.btnFontSize,20):prev.btnFontSize,btnFontWeight:b.btnFontWeight!==undefined?sStr(b.btnFontWeight,10):prev.btnFontWeight,lineHeight:b.lineHeight!==undefined?sStr(b.lineHeight,20):prev.lineHeight,letterSpacing:b.letterSpacing!==undefined?sStr(b.letterSpacing,30):prev.letterSpacing,paddingY:b.paddingY!==undefined?sStr(b.paddingY,20):prev.paddingY,paddingX:b.paddingX!==undefined?sStr(b.paddingX,20):prev.paddingX,borderRadius:b.borderRadius!==undefined?sStr(b.borderRadius,20):prev.borderRadius,borderColor:b.borderColor!==undefined?sStr(b.borderColor,80):prev.borderColor,borderWidth:b.borderWidth!==undefined?sStr(b.borderWidth,20):prev.borderWidth,shadowEnabled:b.shadowEnabled!==undefined?Boolean(b.shadowEnabled):prev.shadowEnabled,glowEnabled:b.glowEnabled!==undefined?Boolean(b.glowEnabled):prev.glowEnabled,glassEffect:b.glassEffect!==undefined?Boolean(b.glassEffect):prev.glassEffect,fullWidth:b.fullWidth!==undefined?Boolean(b.fullWidth):prev.fullWidth,showDesktop:b.showDesktop!==undefined?Boolean(b.showDesktop):prev.showDesktop,showMobile:b.showMobile!==undefined?Boolean(b.showMobile):prev.showMobile,updatedAt:new Date().toISOString()};cmsLog(cms,'promobar.update',`تحديث شريط: "${cms.promoBars[idx].text.slice(0,40)}"`);await saveCMS(cms);res.json({ok:true,bar:cms.promoBars[idx]});}catch(e){res.status(500).json({error:e.message});}});
app.delete('/api/admin/cms/promobars/:id',requireAdmin,async(req,res)=>{try{const cms=await loadCMS();if(!Array.isArray(cms.promoBars))cms.promoBars=[];const idx=cms.promoBars.findIndex(b=>b.id===req.params.id);if(idx===-1)return res.status(404).json({error:'الشريط غير موجود'});const[rem]=cms.promoBars.splice(idx,1);cmsLog(cms,'promobar.delete',`حذف شريط: "${rem.text.slice(0,40)}"`);await saveCMS(cms);res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/admin/cms/promobars/reorder',requireAdmin,async(req,res)=>{try{const ids=req.body.ids;if(!Array.isArray(ids))return res.status(400).json({error:'ids[] required'});const cms=await loadCMS();if(!Array.isArray(cms.promoBars))cms.promoBars=[];const map=Object.fromEntries(cms.promoBars.map(b=>[b.id,b]));cms.promoBars=ids.filter(id=>map[id]).map((id,i)=>({...map[id],order:i}));cmsLog(cms,'promobar.reorder','ترتيب الأشرطة');await saveCMS(cms);res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

// Sidebar (admin)
app.get('/api/admin/cms/sidebar',requireAdmin,async(req,res)=>{try{const cms=await loadCMS();res.json({sidebar:cms.sidebar||[]});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/admin/cms/sidebar',requireAdmin,async(req,res)=>{try{const b=req.body;const item={id:cmsId(),pageId:sStr(b.pageId,100),title:sStr(b.title,200),group:sStr(b.group,100)||'Main',icon:sStr(b.icon,100)||'📄',iconType:['emoji','img'].includes(b.iconType)?b.iconType:'emoji',iconImg:sStr(b.iconImg,500),order:Number(b.order)||0,visible:b.visible!==false,enabled:b.enabled!==false,badge:b.badge&&b.badge.text?{text:sStr(b.badge.text,50),color:sStr(b.badge.color,30)||'#5fe2ff'}:null,external:Boolean(b.external),externalUrl:sStr(b.externalUrl,500),featured:Boolean(b.featured),isNew:Boolean(b.isNew),isPro:Boolean(b.isPro),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};const cms=await loadCMS();if(!Array.isArray(cms.sidebar))cms.sidebar=[];cms.sidebar.push(item);cmsLog(cms,'sidebar.create',`عنصر قائمة: "${item.title}"`);await saveCMS(cms);res.json({ok:true,item});}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/admin/cms/sidebar/:id',requireAdmin,async(req,res)=>{try{const cms=await loadCMS();if(!Array.isArray(cms.sidebar))cms.sidebar=[];const idx=cms.sidebar.findIndex(i=>i.id===req.params.id);if(idx===-1)return res.status(404).json({error:'العنصر غير موجود'});const b=req.body;const prev=cms.sidebar[idx];const upd={...prev};if(b.pageId!==undefined)upd.pageId=sStr(b.pageId,100);if(b.title!==undefined)upd.title=sStr(b.title,200);if(b.group!==undefined)upd.group=sStr(b.group,100);if(b.icon!==undefined)upd.icon=sStr(b.icon,100);if(b.iconType!==undefined)upd.iconType=b.iconType;if(b.iconImg!==undefined)upd.iconImg=sStr(b.iconImg,500);if(b.order!==undefined)upd.order=Number(b.order);if(b.visible!==undefined)upd.visible=Boolean(b.visible);if(b.enabled!==undefined)upd.enabled=Boolean(b.enabled);if(b.badge!==undefined)upd.badge=b.badge&&b.badge.text?{text:sStr(b.badge.text,50),color:sStr(b.badge.color,30)||'#5fe2ff'}:null;if(b.external!==undefined)upd.external=Boolean(b.external);if(b.externalUrl!==undefined)upd.externalUrl=sStr(b.externalUrl,500);if(b.featured!==undefined)upd.featured=Boolean(b.featured);if(b.isNew!==undefined)upd.isNew=Boolean(b.isNew);if(b.isPro!==undefined)upd.isPro=Boolean(b.isPro);upd.updatedAt=new Date().toISOString();cms.sidebar[idx]=upd;cmsLog(cms,'sidebar.update',`تحديث قائمة: "${upd.title}"`);await saveCMS(cms);res.json({ok:true,item:upd});}catch(e){res.status(500).json({error:e.message});}});
app.delete('/api/admin/cms/sidebar/:id',requireAdmin,async(req,res)=>{try{const cms=await loadCMS();if(!Array.isArray(cms.sidebar))cms.sidebar=[];const idx=cms.sidebar.findIndex(i=>i.id===req.params.id);if(idx===-1)return res.status(404).json({error:'العنصر غير موجود'});const[rem]=cms.sidebar.splice(idx,1);cmsLog(cms,'sidebar.delete',`حذف قائمة: "${rem.title}"`);await saveCMS(cms);res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});
app.post('/api/admin/cms/sidebar/reorder',requireAdmin,async(req,res)=>{try{const ids=req.body.ids;if(!Array.isArray(ids))return res.status(400).json({error:'ids[] required'});const cms=await loadCMS();if(!Array.isArray(cms.sidebar))cms.sidebar=[];const map=Object.fromEntries(cms.sidebar.map(i=>[i.id,i]));const reordered=ids.filter(id=>map[id]).map((id,i)=>({...map[id],order:i}));const extras=cms.sidebar.filter(i=>!ids.includes(i.id));cms.sidebar=[...reordered,...extras];cmsLog(cms,'sidebar.reorder','ترتيب القائمة الجانبية');await saveCMS(cms);res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

// Media (admin)
app.get('/api/admin/cms/media',requireAdmin,(req,res)=>{try{const uploadDir=path.join(__dirname,'uploads');const files=[];const exts=new Set(['.jpg','.jpeg','.png','.gif','.webp','.svg','.avif']);if(fs.existsSync(uploadDir)){fs.readdirSync(uploadDir,{recursive:true}).forEach(f=>{const full=path.join(uploadDir,f);try{const stat=fs.statSync(full);if(stat.isFile()&&exts.has(path.extname(f).toLowerCase())){files.push({name:path.basename(f),url:'/uploads/'+f.replace(/\\/g,'/'),size:stat.size,createdAt:stat.birthtime||stat.mtime});}}catch{}});}res.json({media:files.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,200)});}catch(e){res.status(500).json({error:e.message});}});
app.delete('/api/admin/cms/media/:filename',requireAdmin,(req,res)=>{const name=path.basename(req.params.filename);const filePath=path.join(__dirname,'uploads',name);if(!filePath.startsWith(path.join(__dirname,'uploads')))return res.status(400).json({error:'مسار غير مسموح'});if(!fs.existsSync(filePath))return res.status(404).json({error:'الملف غير موجود'});fs.unlinkSync(filePath);auditLog('admin.media.delete','file="'+name+'"',req);res.json({ok:true});});

// CMS_SYSTEM_END

app.post('/api/prompt', requireSignedIn, async (req, res) => {
  try {
    const body = req.body.prompt ? req.body : { prompt: req.body };
    const r = await fetch(`${COMFY_URL}/prompt`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data = await r.json();
    if(data.error){
      console.error('❌ Error:', JSON.stringify(data.error,null,2));
      if(data.node_errors) console.error('Nodes:', JSON.stringify(data.node_errors,null,2));
    } else { console.log(`✓ Queued: ${data.prompt_id}`); }
    res.json(data);
  } catch(e){ console.error('❌',e.message); res.status(500).json({ error: "حدث خطأ في الخادم" }); }
});

// â•â•â• WAIT FOR COMFYUI THEN START â•â•â•
async function waitForComfyUI(maxAttempts=30) {
  console.log('  ⏳ انتظار تشغيل ComfyUI...');
  for (let i=1; i<=maxAttempts; i++) {
    try {
      const r = await fetch(`${COMFY_URL}/system_stats`, {signal:AbortSignal.timeout(2000)});
      if (r.ok) { console.log('  ✅ ComfyUI جاهز!'); return true; }
    } catch {}
    process.stdout.write(`\r  â³ Ù…Ø­Ø§ÙˆÙ„Ø© ${i}/${maxAttempts}...`);
    await new Promise(r=>setTimeout(r,3000));
  }
  console.log('\n  âš ï¸  ComfyUI Ù„Ù… ÙŠØ³ØªØ¬Ø¨ â€” ØªØ£ÙƒØ¯ Ù…Ù† ØªØ´ØºÙŠÙ„Ù‡');
  return false;
}


// ═══════════════════════════════════════════════════════════════════════════════
// USER ACCOUNT ENDPOINTS  (all require authentication, filtered by userId)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/user/dashboard — per-user summary (credits, subscription, usage)
app.get('/api/user/dashboard', requireSignedIn, (req, res) => {
  try {
    const u = req.currentUser;
    const usage = getUserUsageData(u.id);
    const safeUser = u;
    const isStarter = (u.plan || 'starter') === 'starter';
    const subActive = isSubscriptionActive(u);
    const status = isStarter ? (u.credits > 0 ? 'free' : 'no_credits') : (subActive ? 'active' : 'expired');
    res.json({
      user: safeUser,
      usage,
      subscription: {
        plan:                u.plan,
        status,
        subscriptionStartDate: u.subscriptionStartDate || null,
        subscriptionEndDate:   u.subscriptionEndDate   || null,
        renewDate:           u.renewDate || null,
        credits:             u.credits   || 0,
        maxCredits:          u.maxCredits || 0,
        pendingPlan:         u.pendingPlan || null
      }
    });
  } catch(e) { res.status(500).json({ error: 'خطأ داخلي' }); }
});

// GET /api/user/analytics — detailed per-user usage analytics
app.get('/api/user/analytics', requireSignedIn, (req, res) => {
  try {
    const usage = getUserUsageData(req.currentUser.id);
    res.json({ ok: true, userId: req.currentUser.id, ...usage });
  } catch(e) { res.status(500).json({ error: 'خطأ داخلي' }); }
});

// GET /api/user/billing — subscription + order history for current user only
app.get('/api/user/billing', requireSignedIn, async (req, res) => {
  try {
    const u = req.currentUser;
    const allOrders = await getAllOrders();
    // STRICT OWNERSHIP: filter orders by current user's id only
    const myOrders = allOrders
      .filter(o => o.userId === u.id)
      .map(o => ({ id: o.id, pack: o.pack, credits: o.credits, status: o.status, createdAt: o.createdAt, approvedAt: o.approvedAt || null }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({
      plan:                u.plan                || 'starter',
      credits:             u.credits             || 0,
      maxCredits:          u.maxCredits          || 0,
      subscriptionStartDate: u.subscriptionStartDate || null,
      subscriptionEndDate:   u.subscriptionEndDate   || null,
      renewDate:           u.renewDate           || null,
      status:              isSubscriptionActive(u) ? 'active' : 'expired',
      nanoBananaFree:      u.nanoBananaFree       || false,
      orders: myOrders
    });
  } catch(e) { res.status(500).json({ error: 'خطأ داخلي' }); }
});

// GET /api/user/orders — paginated order history for current user only
app.get('/api/user/orders', requireSignedIn, async (req, res) => {
  try {
    const allOrders = await getAllOrders();
    const myOrders = allOrders
      .filter(o => o.userId === req.currentUser.id)
      .map(o => ({ id: o.id, pack: o.pack, credits: o.credits, status: o.status, createdAt: o.createdAt, approvedAt: o.approvedAt || null }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ orders: myOrders });
  } catch(e) { res.status(500).json({ error: 'خطأ داخلي' }); }
});

const startServer = (port) => {
  const server = app.listen(port, async () => {
    console.log('');
    console.log('  ╔═══════════════════════════════════════╗');
    console.log('  ║       SAAD STUDIO  SERVER            ║');
    console.log('  ╠═══════════════════════════════════════╣');
    console.log(`  ║  🌐  http://localhost:${port}         ║`);
    console.log(`  ║  ⚡  ComfyUI: ${COMFY_URL}   ║`);
    console.log('  ╚═══════════════════════════════════════╝');
    console.log('');
    if(COMFY_ENABLED) await waitForComfyUI();
    console.log('');
    console.log(`  ✔ الموقع جاهز على http://localhost:${port}`);
    console.log('');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`  ⚠ Port ${port} busy, switching to ${port + 1}...`);
      server.close();
      startServer(port + 1);
    } else {
      throw err;
    }
  });

  process.on('SIGTERM', () => server.close(() => process.exit(0)));
  process.on('SIGINT',  () => server.close(() => process.exit(0)));
};

startServer(PORT);

// â•â•â• GLOBAL ERROR HANDLER â€” hide stack traces in production â•â•â•
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (!IS_PROD) {
    console.error('[ERROR]', err.message, err.stack);
    return res.status(status).json({ error: err.message });
  }
  console.error('[ERROR]', err.message);
  return res.status(status).json({ error: 'حدث خطأ داخلي' });
});







