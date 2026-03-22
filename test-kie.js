// ═══ PATCH: Fix KIE balance (server.js + dashboard.html) ═══
const fs = require('fs');
const path = require('path');

function patchReplace(file, oldStr, newStr, label) {
  let content = fs.readFileSync(file, 'utf8');
  const hasCRLF = content.includes('\r\n');
  if (hasCRLF) {
    content = content.replace(/\r\n/g, '\n');
    oldStr = oldStr.replace(/\r\n/g, '\n');
    newStr = newStr.replace(/\r\n/g, '\n');
  }
  
  const idx = content.indexOf(oldStr);
  if (idx === -1) {
    console.error(`[FAIL] ${label} — anchor not found`);
    console.error('  Looking for:', oldStr.substring(0, 80));
    process.exit(1);
  }
  content = content.slice(0, idx) + newStr + content.slice(idx + oldStr.length);
  if (hasCRLF) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, content, 'utf8');
  console.log(`[OK] ${label}`);
}

const SERVER = path.join(__dirname, 'server.js');
const DASH = path.join(__dirname, 'dashboard.html');
const KIE_BAL_FILE = path.join(__dirname, 'vault', 'kie_balance.json');

// ═══ 0. Create vault/kie_balance.json with initial 8244
if (!fs.existsSync(KIE_BAL_FILE)) {
  fs.writeFileSync(KIE_BAL_FILE, JSON.stringify({ balance: 8244, updatedAt: new Date().toISOString() }, null, 2));
  console.log('[OK] Created vault/kie_balance.json (initial: 8244)');
} else {
  console.log('[SKIP] vault/kie_balance.json already exists');
}

// ═══ 1. Replace server.js kie-balance endpoint
patchReplace(SERVER,
`// GET /api/admin/kie-balance — fetch KIE API balance
app.get('/api/admin/kie-balance', requireAdmin, async (req, res) => {
  try {
    const response = await axios.get('https://api.kie.ai/v1/user/balance', {
      headers: {
        Authorization: \`Bearer \${process.env.KIE_API_KEY}\`
      }
    });
    res.json({ success: true, balance: response.data.balance });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch balance' });
  }
});`,

`// GET /api/admin/kie-balance — read stored KIE balance + spent credits
const KIE_BALANCE_FILE = path.join(VAULT_DIR, 'kie_balance.json');
function loadKieBalance() {
  try { return JSON.parse(fs.readFileSync(KIE_BALANCE_FILE, 'utf8')); }
  catch { return { balance: 0, updatedAt: null }; }
}
function saveKieBalance(data) {
  fs.writeFileSync(KIE_BALANCE_FILE, JSON.stringify(data, null, 2));
}
function getTotalSpentCredits() {
  try {
    const raw = loadUsage();
    let total = 0;
    for (const userId of Object.keys(raw)) {
      for (const [key, val] of Object.entries(raw[userId])) {
        if (/^\\d{4}-\\d{2}$/.test(key)) total += (val.credits || 0);
      }
    }
    return total;
  } catch { return 0; }
}

app.get('/api/admin/kie-balance', requireAdmin, (req, res) => {
  const data = loadKieBalance();
  const spent = getTotalSpentCredits();
  const remaining = Math.max(0, (data.balance || 0) - spent);
  res.json({
    success: true,
    balance: data.balance || 0,
    spent,
    remaining,
    updatedAt: data.updatedAt
  });
});

// POST /api/admin/kie-balance — admin updates the stored balance
app.post('/api/admin/kie-balance', requireAdmin, (req, res) => {
  const csrf = req.headers['x-csrf-token'] || '';
  if (!csrf || csrf !== req.adminSession.csrf) {
    return res.status(403).json({ success: false, message: 'Invalid CSRF' });
  }
  const newBalance = Number(req.body.balance);
  if (isNaN(newBalance) || newBalance < 0) {
    return res.status(400).json({ success: false, message: 'Invalid balance value' });
  }
  saveKieBalance({ balance: newBalance, updatedAt: new Date().toISOString() });
  const spent = getTotalSpentCredits();
  res.json({ success: true, balance: newBalance, spent, remaining: Math.max(0, newBalance - spent) });
});`,
  'P1: Replace kie-balance endpoint in server.js'
);

// ═══ 2. Replace dashboard.html KIE balance box HTML
patchReplace(DASH,
`<!-- ═══ HEADER: BACK + KIE ═══ -->
<div class="dashboard-header">
  <a href="/" class="back-btn">← الرجوع إلى الموقع</a>
  <div class="kie-balance-box">
    <h3>رصيد KIE</h3>
    <div id="kie-balance">جارٍ التحميل...</div>
  </div>
</div>`,

`<!-- ═══ HEADER: BACK + KIE ═══ -->
<div class="dashboard-header">
  <a href="/" class="back-btn">← الرجوع إلى الموقع</a>
  <div class="kie-balance-box">
    <h3>💰 رصيد KIE</h3>
    <div id="kie-balance">جارٍ التحميل...</div>
    <div id="kie-spent" style="font-size:13px;color:var(--tx2);margin-top:6px;"></div>
    <div id="kie-remaining" style="font-size:15px;color:var(--green);margin-top:4px;font-weight:700;"></div>
    <div style="margin-top:10px;display:flex;gap:6px;align-items:center;justify-content:center;">
      <input id="kie-bal-input" type="number" class="cr-input" style="width:100px;" placeholder="رصيد جديد">
      <button class="act-save" onclick="updateKieBalance()">تحديث</button>
    </div>
    <div id="kie-updated" style="font-size:10px;color:var(--tx3);margin-top:6px;"></div>
  </div>
</div>`,
  'P2: Replace KIE balance HTML in dashboard'
);

// ═══ 3. Replace dashboard.html loadKieBalance() script
patchReplace(DASH,
`// ── KIE Balance ──
async function loadKieBalance() {
  try {
    const res = await fetch('/api/admin/kie-balance', { credentials: 'same-origin' });
    const data = await res.json();
    if (data.success) {
      document.getElementById('kie-balance').innerText = data.balance + ' Credits';
    } else {
      document.getElementById('kie-balance').innerText = 'تعذر جلب الرصيد';
    }
  } catch (err) {
    document.getElementById('kie-balance').innerText = 'خطأ في الاتصال';
  }
}
loadKieBalance();`,

`// ── KIE Balance ──
async function loadKieBalance() {
  try {
    const res = await fetch('/api/admin/kie-balance', { credentials: 'same-origin' });
    const data = await res.json();
    if (data.success) {
      $('kie-balance').innerText = data.balance.toLocaleString() + ' Credits';
      $('kie-spent').innerText = 'مصروف: ' + data.spent.toLocaleString();
      $('kie-remaining').innerText = 'متبقي: ' + data.remaining.toLocaleString() + ' Credits';
      if (data.updatedAt) {
        $('kie-updated').innerText = 'آخر تحديث: ' + new Date(data.updatedAt).toLocaleString('ar');
      }
      $('kie-bal-input').value = data.balance;
    } else {
      $('kie-balance').innerText = 'تعذر جلب الرصيد';
    }
  } catch (err) {
    $('kie-balance').innerText = 'خطأ في الاتصال';
  }
}
async function updateKieBalance() {
  const val = Number($('kie-bal-input').value);
  if (isNaN(val) || val < 0) return toast('أدخل رقم صحيح', 'red');
  try {
    const res = await fetch('/api/admin/kie-balance', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ balance: val })
    });
    const data = await res.json();
    if (data.success) {
      toast('تم تحديث الرصيد ✅', 'green');
      loadKieBalance();
    } else {
      toast(data.message || 'فشل التحديث', 'red');
    }
  } catch (e) {
    toast('خطأ في الاتصال', 'red');
  }
}
loadKieBalance();`,
  'P3: Replace loadKieBalance script in dashboard'
);

console.log('\\n✅ All KIE balance patches applied!');

