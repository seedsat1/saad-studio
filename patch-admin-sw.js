// Add service worker registration to all admin HTML files
const fs = require('fs');
const path = require('path');
const adminDir = path.join('public','admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));

const swScript = `
<!-- PWA Service Worker Registration -->
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function(reg) { console.log('[PWA] SW registered:', reg.scope); })
      .catch(function(err) { console.warn('[PWA] SW registration failed:', err); });
  });
}
</script>
</body>`;

let patched = 0;
files.forEach(f => {
  const fp = path.join(adminDir, f);
  let content = fs.readFileSync(fp, 'utf8');
  if (!content.includes('/sw.js')) {
    content = content.replace('</body>', swScript);
    fs.writeFileSync(fp, content, 'utf8');
    patched++;
    console.log('SW added:', f);
  } else {
    console.log('Already has SW:', f);
  }
});
console.log('Done. Patched:', patched);
