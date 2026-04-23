const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 5050);

function loadEnvIfExists(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return false;
    const raw = fs.readFileSync(filePath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx <= 0) return;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = value;
    });
    return true;
  } catch {
    return false;
  }
}

const ENV_CANDIDATES = [
  process.env.KIE_ENV_FILE,
  path.join(ROOT, '.env'),
  path.join(ROOT, '.env.local'),
  path.resolve(ROOT, '..', '.env.local'),
  path.resolve(ROOT, '..', '..', '.env.local'),
  path.resolve(ROOT, '..', '..', '..', '.env.local'),
  'D:\\موقع ثاني\\next14 ai saas\\next14-ai-saas-main\\next14-ai-saas-main\\.env.local'
].filter(Boolean);

for (const envPath of ENV_CANDIDATES) {
  loadEnvIfExists(envPath);
}

const KIE_BASE = 'https://api.kie.ai/api/v1/jobs';
const KIE_VEO_BASE = 'https://api.kie.ai/api/v1/veo';
const KIE_GPT52_BASE = 'https://api.kie.ai/gpt-5-2/v1';
const KIE_API_KEY = process.env.KIE_API_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_UPLOAD_BUCKET = process.env.SUPABASE_UPLOAD_BUCKET || 'studio-frames';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
  ,
  '.webp': 'image/webp',
  '.mov': 'video/quicktime'
};

function safeResolve(urlPath) {
  const clean = decodeURIComponent((urlPath || '/').split('?')[0]);
  const normalized = path.normalize(clean).replace(/^([\\/])+/, '');
  const full = path.join(ROOT, normalized || 'prompt.html');
  return full.startsWith(ROOT) ? full : null;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getTaskIdFromUrl(urlStr) {
  const full = new URL(urlStr || '/', 'http://localhost');
  return (full.searchParams.get('taskId') || '').trim();
}

function safeFilePart(name) {
  return String(name || 'file')
    .replace(/[^\w.\-]/g, '_')
    .slice(-120);
}

async function callKie(pathname, options) {
  const response = await fetch(`${KIE_BASE}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { code: response.status, msg: text || 'Invalid response from Kie.ai' };
  }

  return { ok: response.ok, status: response.status, data: parsed };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/kie/createTask') {
    if (!KIE_API_KEY) {
      return sendJson(res, 500, { code: 500, msg: 'Missing KIE_API_KEY in server environment' });
    }

    try {
      const body = await readBody(req);
      if (!body) {
        return sendJson(res, 400, { code: 400, msg: 'Invalid JSON body' });
      }
      if (!body.model || typeof body.model !== 'string' || !body.input || typeof body.input !== 'object') {
        return sendJson(res, 400, { code: 400, msg: 'model and input are required' });
      }

      const apiRes = await callKie('/createTask', {
        method: 'POST',
        body: JSON.stringify({
          model: body.model,
          input: body.input,
          callBackUrl: body.callBackUrl || undefined
        })
      });

      return sendJson(res, apiRes.status, apiRes.data);
    } catch (error) {
      return sendJson(res, 500, { code: 500, msg: error?.message || 'Server error while creating Kie task' });
    }
  }

  if (req.method === 'POST' && req.url === '/api/kie/gpt-5-2/chat') {
    if (!KIE_API_KEY) {
      return sendJson(res, 500, { code: 500, msg: 'Missing KIE_API_KEY in server environment' });
    }
    try {
      const body = await readBody(req);
      if (!body || typeof body !== 'object') {
        return sendJson(res, 400, { code: 400, msg: 'Invalid JSON body' });
      }
      const messages = Array.isArray(body.messages) ? body.messages : null;
      if (!messages || !messages.length) {
        return sendJson(res, 400, { code: 400, msg: 'messages array is required' });
      }

      const payload = {
        messages,
        reasoning_effort: body.reasoning_effort === 'low' ? 'low' : 'high'
      };
      if (Array.isArray(body.tools)) payload.tools = body.tools;

      const apiRes = await fetch(`${KIE_GPT52_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KIE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const text = await apiRes.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { code: apiRes.status, msg: text || 'Invalid response from GPT 5.2 API' };
      }
      return sendJson(res, apiRes.status, parsed);
    } catch (error) {
      return sendJson(res, 500, { code: 500, msg: error?.message || 'Server error while calling GPT 5.2 API' });
    }
  }

  if (req.method === 'GET' && req.url?.startsWith('/api/kie/recordInfo')) {
    if (!KIE_API_KEY) {
      return sendJson(res, 500, { code: 500, msg: 'Missing KIE_API_KEY in server environment' });
    }

    const taskId = getTaskIdFromUrl(req.url);
    if (!taskId) {
      return sendJson(res, 400, { code: 400, msg: 'taskId query parameter is required' });
    }

    try {
      const apiRes = await callKie(`/recordInfo?taskId=${encodeURIComponent(taskId)}`, { method: 'GET' });
      return sendJson(res, apiRes.status, apiRes.data);
    } catch (error) {
      return sendJson(res, 500, { code: 500, msg: error?.message || 'Server error while querying Kie task' });
    }
  }

  if (req.method === 'POST' && req.url === '/api/kie/veo/generate') {
    if (!KIE_API_KEY) {
      return sendJson(res, 500, { code: 500, msg: 'Missing KIE_API_KEY in server environment' });
    }
    try {
      const body = await readBody(req);
      if (!body || typeof body !== 'object') {
        return sendJson(res, 400, { code: 400, msg: 'Invalid JSON body' });
      }
      const apiRes = await fetch(`${KIE_VEO_BASE}/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KIE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const text = await apiRes.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = { code: apiRes.status, msg: text || 'Invalid response from Veo API' }; }
      return sendJson(res, apiRes.status, parsed);
    } catch (error) {
      return sendJson(res, 500, { code: 500, msg: error?.message || 'Server error while creating Veo task' });
    }
  }

  if (req.method === 'GET' && req.url?.startsWith('/api/kie/veo/record-info')) {
    if (!KIE_API_KEY) {
      return sendJson(res, 500, { code: 500, msg: 'Missing KIE_API_KEY in server environment' });
    }
    const full = new URL(req.url || '/', 'http://localhost');
    const taskId = (full.searchParams.get('taskId') || '').trim();
    if (!taskId) {
      return sendJson(res, 400, { code: 400, msg: 'taskId query parameter is required' });
    }
    try {
      const apiRes = await fetch(`${KIE_VEO_BASE}/record-info?taskId=${encodeURIComponent(taskId)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${KIE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      const text = await apiRes.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = { code: apiRes.status, msg: text || 'Invalid response from Veo API' }; }
      return sendJson(res, apiRes.status, parsed);
    } catch (error) {
      return sendJson(res, 500, { code: 500, msg: error?.message || 'Server error while querying Veo task' });
    }
  }

  if (req.method === 'POST' && req.url === '/api/upload/frame') {
    try {
      const body = await readBody(req);
      if (!body || typeof body !== 'object') {
        return sendJson(res, 400, { code: 400, msg: 'Invalid JSON body' });
      }
      const filename = safeFilePart(body.filename || 'frame.png');
      const mimeType = String(body.mimeType || 'application/octet-stream');
      const base64 = String(body.base64 || '').trim();
      if (!base64) return sendJson(res, 400, { code: 400, msg: 'base64 is required' });

      const bytes = Buffer.from(base64, 'base64');
      if (!bytes.length) return sendJson(res, 400, { code: 400, msg: 'Invalid base64 data' });
      if (bytes.length > 15 * 1024 * 1024) {
        return sendJson(res, 413, { code: 413, msg: 'File too large. Max 15MB.' });
      }

      const ext = path.extname(filename) || '.bin';
      const objectPath = `frames/${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`;

      // Local fallback for development when Supabase keys are not configured.
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        const localDir = path.join(ROOT, 'uploads', 'frames');
        fs.mkdirSync(localDir, { recursive: true });
        const localFile = path.join(localDir, path.basename(objectPath));
        fs.writeFileSync(localFile, bytes);
        const localUrl = `/uploads/frames/${path.basename(objectPath)}`;
        return sendJson(res, 200, { code: 200, url: localUrl, path: objectPath, storage: 'local' });
      }

      const upUrl = `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/${SUPABASE_UPLOAD_BUCKET}/${objectPath}`;
      const upRes = await fetch(upUrl, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': mimeType,
          'x-upsert': 'true'
        },
        body: bytes
      });
      const upText = await upRes.text();
      if (!upRes.ok) {
        let parsed = {};
        try { parsed = JSON.parse(upText); } catch {}
        return sendJson(res, upRes.status, {
          code: upRes.status,
          msg: parsed?.message || parsed?.error || upText || 'Supabase upload failed'
        });
      }

      const publicUrl = `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/${SUPABASE_UPLOAD_BUCKET}/${objectPath}`;
      return sendJson(res, 200, { code: 200, url: publicUrl, path: objectPath });
    } catch (error) {
      return sendJson(res, 500, { code: 500, msg: error?.message || 'Upload error' });
    }
  }

  let filePath = safeResolve(req.url || '/');
  if (req.url?.startsWith('/uploads/')) {
    const upPath = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\/+/, '');
    const fullUp = path.join(ROOT, upPath);
    if (!fullUp.startsWith(path.join(ROOT, 'uploads'))) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    return fs.readFile(fullUp, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Not Found');
      }
      const ext = path.extname(fullUp).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      res.end(data);
    });
  }
  if (!filePath) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    const fallback = path.join(ROOT, 'prompt.html');
    if (fs.existsSync(fallback)) filePath = fallback;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('Local pages server running on http://localhost:' + PORT);
  console.log('Root:', ROOT);
  if (!KIE_API_KEY) {
    console.log('Warning: KIE_API_KEY is missing. /api/kie/* endpoints will fail until it is set.');
  }
});
