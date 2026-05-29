const fs = require('fs');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[match[1]] = value.trim();
    }
  });
  return env;
}

const envLocal = parseEnv('.env.local');
const envRoot = parseEnv('.env');

const merged = { ...envRoot, ...envLocal };

console.log("FROM FILES:");
console.log("  OPENAI_API_KEY exists:", !!merged.OPENAI_API_KEY);
console.log("  KIE_API_KEY exists:", !!merged.KIE_API_KEY || !!merged.KIEAI_API_KEY);

console.log("FROM SYSTEM PROCESS.ENV:");
console.log("  OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
console.log("  KIE_API_KEY exists:", !!process.env.KIE_API_KEY || !!process.env.KIEAI_API_KEY);
console.log("  DATABASE_URL exists:", !!process.env.DATABASE_URL);
