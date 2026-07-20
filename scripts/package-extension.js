const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const downloadsDir = path.join(__dirname, '..', 'public', 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Copy client build into CEP share package
const clientDist = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'client', 'dist');
const pkgClientDist = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'share-package', 'app.saadstudio.cep', 'client', 'dist');

if (fs.existsSync(clientDist)) {
  copyDir(clientDist, pkgClientDist);
  console.log('Copied client/dist to share-package');
}

const masterJsx = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'jsx', 'index.jsx');
const pkgJsx = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'share-package', 'app.saadstudio.cep', 'jsx', 'index.jsx');
if (fs.existsSync(masterJsx)) {
  fs.copyFileSync(masterJsx, pkgJsx);
  console.log('Copied master jsx/index.jsx to share-package');
}

const masterManifest = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'CSXS', 'manifest.xml');
const pkgManifest = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'share-package', 'app.saadstudio.cep', 'CSXS', 'manifest.xml');
if (fs.existsSync(masterManifest)) {
  fs.copyFileSync(masterManifest, pkgManifest);
  console.log('Copied master CSXS/manifest.xml to share-package');
}

// 1.5. Bundle Visual C++ helper DLL runtimes for subscriber PCs
execSync('node scripts/bundle-runtimes.js', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

// 2. Generate payload.zip (embedded extension contents)
const sharePkgApp = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'share-package', 'app.saadstudio.cep');
const payloadZip = path.join(__dirname, 'payload.zip');

if (fs.existsSync(payloadZip)) fs.unlinkSync(payloadZip);
console.log('Creating embedded payload.zip...');
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${sharePkgApp}\\*' -DestinationPath '${payloadZip}' -Force"`, { stdio: 'inherit' });
console.log('payload.zip created:', fs.statSync(payloadZip).size, 'bytes');

// 3. Generate C# installer source code
execSync('node scripts/gen-installer.js', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

// 4. Compile C# Standalone Installer EXE with embedded payload & icon
const csc = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const csSource = path.join(__dirname, 'Installer.cs');
const icoPath = path.join(__dirname, 'app.ico');
const exeOut = path.join(downloadsDir, 'SaadStudio-Setup.exe');
const shareExeOut = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'share-package', 'SaadStudio-Setup.exe');

if (fs.existsSync(csc) && fs.existsSync(csSource)) {
  try {
    const iconFlag = fs.existsSync(icoPath) ? `/win32icon:"${icoPath}"` : '';
    const manifestPath = path.join(__dirname, 'app.manifest');
    const manifestFlag = fs.existsSync(manifestPath) ? `/win32manifest:"${manifestPath}"` : '';
    const resourceFlag = `/resource:"${payloadZip}",SaadStudioInstaller.payload.zip`;
    const refFlag = `/r:System.IO.Compression.FileSystem.dll`;
    execSync(`"${csc}" /target:winexe ${refFlag} ${resourceFlag} ${iconFlag} ${manifestFlag} /out:"${exeOut}" "${csSource}"`, { stdio: 'inherit' });
    fs.copyFileSync(exeOut, shareExeOut);
    console.log('Compiled standalone SaadStudio-Setup.exe successfully! Size:', fs.statSync(exeOut).size, 'bytes');
  } catch (err) {
    console.error('Failed to compile C# installer EXE:', err.message);
  }
}

// 5. Compress ZXP & Manual Zip packages
const sharePkgRoot = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'share-package');
const zipOut = path.join(downloadsDir, 'SaadStudio.zip');
const zxpOut = path.join(downloadsDir, 'SaadStudio.zxp');
const manualOut = path.join(downloadsDir, 'SaadStudio-manual.zip');

if (fs.existsSync(zxpOut)) fs.unlinkSync(zxpOut);
if (fs.existsSync(zipOut)) fs.unlinkSync(zipOut);
if (fs.existsSync(manualOut)) fs.unlinkSync(manualOut);

console.log('Compressing SaadStudio.zxp...');
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${sharePkgApp}\\*' -DestinationPath '${zipOut}' -Force"`, { stdio: 'inherit' });
fs.renameSync(zipOut, zxpOut);

console.log('Compressing SaadStudio-manual.zip...');
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${sharePkgRoot}\\app.saadstudio.cep','${sharePkgRoot}\\SaadStudio-Setup.exe','${sharePkgRoot}\\تثبيت_سعد_استوديو_تلقائياً.bat' -DestinationPath '${manualOut}' -Force"`, { stdio: 'inherit' });

console.log('SaadStudio-Setup.exe standalone size:', fs.statSync(exeOut).size, 'bytes');
console.log('SaadStudio.zxp size:', fs.statSync(zxpOut).size, 'bytes');
console.log('SaadStudio-manual.zip size:', fs.statSync(manualOut).size, 'bytes');
