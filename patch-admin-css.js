// Inject pwa-responsive.css into all admin HTML files (after style.css)
const fs = require('fs');
const path = require('path');
const adminDir = path.join('public','admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));

const linkTag = '\n    <link href="css/pwa-responsive.css" rel="stylesheet">';
let patched = 0;

files.forEach(f => {
  const fp = path.join(adminDir, f);
  let content = fs.readFileSync(fp, 'utf8');
  if (!content.includes('pwa-responsive.css')) {
    // Insert after the last style.css link
    content = content.replace(
      '<link href="css/style.css" rel="stylesheet">',
      '<link href="css/style.css" rel="stylesheet">' + linkTag
    );
    fs.writeFileSync(fp, content, 'utf8');
    patched++;
    console.log('Injected CSS:', f);
  } else {
    console.log('Already has pwa-responsive.css:', f);
  }
});
console.log('Done. Patched:', patched);
