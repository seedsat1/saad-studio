const fs = require('fs');
const path = require('path');
const adminDir = path.join('public','admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));
const insertBlock = [
  '',
  '    <link rel="manifest" href="/manifest.json">',
  '    <meta name="mobile-web-app-capable" content="yes">',
  '    <meta name="apple-mobile-web-app-capable" content="yes">',
  '    <meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '    <meta name="apple-mobile-web-app-title" content="SAAD STUDIO Admin">',
].join('\n');

let patched = 0;
files.forEach(f => {
  const fp = path.join(adminDir, f);
  let content = fs.readFileSync(fp, 'utf8');
  if (!content.includes('manifest.json')) {
    if (content.includes('theme-color')) {
      content = content.replace(/(<meta name="theme-color"[^>]*>)/, '$1' + insertBlock);
      fs.writeFileSync(fp, content, 'utf8');
      patched++;
      console.log('Patched:', f);
    } else {
      // fallback: insert before </head>
      content = content.replace('</head>', insertBlock + '\n  </head>');
      fs.writeFileSync(fp, content, 'utf8');
      patched++;
      console.log('Patched (fallback):', f);
    }
  } else {
    console.log('Already has PWA:', f);
  }
});
console.log('Done. Patched:', patched);
