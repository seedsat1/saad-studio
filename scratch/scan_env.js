const fs = require('fs');
if (fs.existsSync('.env.production.pulled')) {
  const content = fs.readFileSync('.env.production.pulled', 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    if (trimmed.includes('KEY') || trimmed.includes('ARK') || trimmed.includes('BYTE')) {
      const parts = trimmed.split('=');
      const key = parts[0];
      const val = parts.slice(1).join('=');
      if (val !== '""' && val !== '') {
        console.log(`${key}: length ${val.length} characters`);
      } else {
        console.log(`${key}: EMPTY`);
      }
    }
  });
} else {
  console.log('.env.production.pulled does not exist');
}
