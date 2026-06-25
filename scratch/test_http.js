const https = require('https');

function testUrl(url) {
  return new Promise((resolve, reject) => {
    console.log(`Fetching: ${url}`);
    https.get(url, (res) => {
      console.log(`Status code: ${res.statusCode}`);
      console.log(`Headers:`);
      for (const [key, val] of Object.entries(res.headers)) {
        console.log(`  ${key}: ${val}`);
      }
      resolve();
    }).on('error', (e) => {
      console.error(`Error: ${e.message}`);
      resolve();
    });
  });
}

async function main() {
  await testUrl('https://saad-studio-6ubqiokw8-saadstudios-projects.vercel.app');
  console.log('\n----------------------------------------\n');
  await testUrl('https://www.saadstudio.app');
}

main().catch(err => console.error(err));
