const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const downloadsDir = path.join(__dirname, '..', 'public', 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

const csc = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const csSource = path.join(__dirname, 'Installer.cs');
const icoPath = path.join(__dirname, 'app.ico');
const exeOut = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'share-package', 'SaadStudio-Setup.exe');

if (fs.existsSync(csc) && fs.existsSync(csSource)) {
  try {
    const iconFlag = fs.existsSync(icoPath) ? `/win32icon:"${icoPath}"` : '';
    execSync(`"${csc}" /target:winexe ${iconFlag} /out:"${exeOut}" "${csSource}"`, { stdio: 'inherit' });
    console.log('Compiled SaadStudio-Setup.exe with win32icon successfully!');
  } catch (err) {
    console.error('Failed to compile C# installer EXE:', err.message);
  }
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

const clientDist = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'client', 'dist');
const pkgClientDist = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'share-package', 'app.saadstudio.cep', 'client', 'dist');

if (fs.existsSync(clientDist)) {
  copyDir(clientDist, pkgClientDist);
  console.log('Copied client/dist to share-package');
}

const sharePkgApp = path.join(__dirname, '..', 'adobe', 'saadstudio-cep', 'share-package', 'app.saadstudio.cep');
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

console.log('SaadStudio.zxp size:', fs.statSync(zxpOut).size, 'bytes');
console.log('SaadStudio-manual.zip size:', fs.statSync(manualOut).size, 'bytes');
