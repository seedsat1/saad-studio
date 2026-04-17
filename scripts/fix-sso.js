const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', 'sso-callback', 'page.tsx');

const content = [
  '"use client";',
  'import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";',
  '',
  'export default function SSOCallbackPage() {',
  '  return (',
  '    <AuthenticateWithRedirectCallback',
  '      signInFallbackRedirectUrl="/dash"',
  '      signUpFallbackRedirectUrl="/dash"',
  '    />',
  '  );',
  '}',
  '',
].join('\n');

fs.writeFileSync(filePath, content, { encoding: 'utf8' });

const bytes = fs.readFileSync(filePath);
console.log('First 4 bytes:', [...bytes.slice(0, 4)].join(','));
console.log('Line 1:', bytes.toString().split('\n')[0]);
console.log('Starts with BOM?', bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF ? 'YES - PROBLEM!' : 'NO - CLEAN');
