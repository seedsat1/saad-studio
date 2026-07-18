const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const downloadsDir = path.join(__dirname, '..', 'public', 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

const batFile = path.join(__dirname, 'zip-pkg.bat');
const scriptContent = `@echo off
chcp 65001 >nul
cd /d "%~dp0.."
mkdir public\\downloads 2>nul

powershell -NoProfile -Command "Set-Location -LiteralPath 'adobe\\saadstudio-cep\\share-package\\app.saadstudio.cep'; Compress-Archive -Path '*' -DestinationPath '..\\..\\..\\..\\public\\downloads\\SaadStudio.zip' -Force"
powershell -NoProfile -Command "Set-Location -LiteralPath 'adobe\\saadstudio-cep\\share-package'; Compress-Archive -Path 'app.saadstudio.cep' -DestinationPath '..\\..\\..\\public\\downloads\\SaadStudio-manual.zip' -Force"

cd /d "%~dp0..\\public\\downloads"
if exist SaadStudio.zxp del SaadStudio.zxp
ren SaadStudio.zip SaadStudio.zxp
`;

fs.writeFileSync(batFile, scriptContent, 'utf8');

try {
  execSync(`cmd /c "${batFile}"`, { stdio: 'inherit' });
  const zxpTarget = path.join(downloadsDir, 'SaadStudio.zxp');
  const zipTarget = path.join(downloadsDir, 'SaadStudio-manual.zip');
  console.log('SaadStudio.zxp size:', fs.statSync(zxpTarget).size, 'bytes');
  console.log('SaadStudio-manual.zip size:', fs.statSync(zipTarget).size, 'bytes');
} finally {
  if (fs.existsSync(batFile)) fs.unlinkSync(batFile);
}
