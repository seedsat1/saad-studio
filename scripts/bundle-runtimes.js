const fs = require('fs');
const path = require('path');

const sys32 = 'C:\\Windows\\System32';
const targetFfmpeg = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'share-package', 'app.saadstudio.cep', 'tools', 'ffmpeg');
const targetRoot = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'share-package', 'app.saadstudio.cep');

const dlls = ['msvcp140.dll', 'vcruntime140.dll', 'vcruntime140_1.dll', 'concrt140.dll'];

fs.mkdirSync(targetFfmpeg, { recursive: true });

dlls.forEach(dll => {
  const src = path.join(sys32, dll);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(targetFfmpeg, dll));
    fs.copyFileSync(src, path.join(targetRoot, dll));
    console.log(`Bundled ${dll} into tools/ffmpeg and extension root.`);
  } else {
    console.warn(`Warning: ${dll} not found in System32.`);
  }
});
