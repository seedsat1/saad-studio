const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const src = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'share-package', 'app.saadstudio.cep');
const outZip = path.join(__dirname, 'payload.zip');

if (fs.existsSync(outZip)) fs.unlinkSync(outZip);
console.log('Creating payload.zip...');
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${src}\\*' -DestinationPath '${outZip}' -Force"`, { stdio: 'inherit' });
console.log('payload.zip size:', fs.statSync(outZip).size, 'bytes');
