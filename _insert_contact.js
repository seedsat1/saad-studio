const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

const marker = "app.get('/api/config'";
const idx = content.indexOf(marker);
if (idx === -1) { console.error('MARKER NOT FOUND'); process.exit(1); }

// Find start of the line containing the marker
const lineStart = content.lastIndexOf('\n', idx - 1);

const insertBlock = `
// POST /api/contact — public contact form -> sends email to support
const contactLimiter = rateLimit({ windowMs: 60*60*1000, max: 5, standardHeaders: true, legacyHeaders: false });
app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !message) return res.status(400).json({ error: 'الاسم والبريد والرسالة مطلوبة' });
    if (!String(email).match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return res.status(400).json({ error: 'البريد غير صالح' });
    if (String(message).length > 5000) return res.status(400).json({ error: 'الرسالة طويلة جداً' });
    const safeHtml = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    await sendEmail({
      to: process.env.EMAIL_USER || 'support@saadstudio.app',
      subject: \`[تواصل معنا] \${subject || 'رسالة جديدة'} — من \${safeHtml(name)}\`,
      html: \`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#0f0f0f;color:#fff;border-radius:12px">
        <h2 style="color:#a78bfa">رسالة جديدة من نموذج التواصل</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;color:#888;width:100px">الاسم:</td><td style="padding:8px">\${safeHtml(name)}</td></tr>
          <tr><td style="padding:8px;color:#888">البريد:</td><td style="padding:8px"><a href="mailto:\${safeHtml(email)}" style="color:#a78bfa">\${safeHtml(email)}</a></td></tr>
          \${subject ? \`<tr><td style="padding:8px;color:#888">الموضوع:</td><td style="padding:8px">\${safeHtml(subject)}</td></tr>\` : ''}
        </table>
        <hr style="margin:16px 0;border-color:#333">
        <div style="background:#1a1a1a;padding:16px;border-radius:8px;white-space:pre-wrap">\${safeHtml(message)}</div>
        <p style="margin-top:16px;color:#888;font-size:12px">يمكنك الرد مباشرة على هذا البريد للتواصل مع المستخدم.</p>
      </div>\`,
      text: \`من: \${name} <\${email}>\nالموضوع: \${subject || '-'}\n\n\${message}\`
    });
    auditLog('contact.form', \`email="\${email}" subject="\${subject || ''}"\`, req);
    res.json({ ok: true });
  } catch (e) { console.error('[contact]', e); res.status(500).json({ error: 'حدث خطأ داخلي' }); }
});
`;

const newContent = content.slice(0, lineStart + 1) + insertBlock + '\n' + content.slice(lineStart + 1);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Done! server.js updated successfully.');
