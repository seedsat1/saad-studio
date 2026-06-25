const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUrl(url) {
  try {
    console.log(`Checking URL: ${url}`);
    
    // We fetch with redirect: 'manual' to verify it's returning a redirect first (302)
    const resManual = await fetch(url, { method: 'GET', redirect: 'manual' });
    console.log(`- Direct Status: ${resManual.status} ${resManual.statusText}`);
    const location = resManual.headers.get('location');
    if (location) {
      console.log(`- Redirects to: ${location}`);
      if (location.includes('r2.dev')) {
        console.error(`  ❌ Error: Redirect URL points to R2: ${location}`);
        return false;
      }
      if (location.includes('/api/media/media/')) {
        console.error(`  ❌ Error: Redirect URL contains duplicate prefix: ${location}`);
        return false;
      }
    } else {
      console.log(`- No redirect header (Location) found.`);
    }

    // Now fetch following redirects to see if we get a 200 OK
    const resFollow = await fetch(url, { method: 'GET', redirect: 'follow' });
    console.log(`- Final Status: ${resFollow.status} ${resFollow.statusText}`);
    console.log(`- Content-Type: ${resFollow.headers.get('content-type')}`);
    console.log(`- Content-Length: ${resFollow.headers.get('content-length')}`);
    
    if (resFollow.status === 200) {
      console.log(`  ✅ Success: returns 200 OK following redirect.`);
      return true;
    } else {
      console.error(`  ❌ Error: final status is ${resFollow.status}`);
      return false;
    }
  } catch (err) {
    console.error(`  ❌ Failed to fetch:`, err.message);
    return false;
  }
}

async function main() {
  console.log('Testing /api/media endpoints on https://www.saadstudio.app ...');
  console.log('==================================================');

  try {
    // 1. Fetch some real video generations from DB
    const generations = await prisma.generation.findMany({
      where: {
        OR: [
          { mediaUrl: { contains: 'videos/' } },
          { outputUrl: { contains: 'videos/' } }
        ]
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    if (generations.length === 0) {
      console.log('No video generations found in the database.');
      return;
    }

    console.log(`Found ${generations.length} video generations to test.`);
    let successCount = 0;
    let totalTests = 0;

    for (const gen of generations) {
      console.log(`\n--- Generation ${gen.id} ---`);
      if (gen.mediaUrl && gen.mediaUrl.includes('videos/')) {
        totalTests++;
        const targetUrl = `https://www.saadstudio.app/api/media/${gen.mediaUrl}`;
        const ok = await checkUrl(targetUrl);
        if (ok) successCount++;
      }
      if (gen.outputUrl && gen.outputUrl.includes('videos/')) {
        totalTests++;
        const targetUrl = `https://www.saadstudio.app/api/media/${gen.outputUrl}`;
        const ok = await checkUrl(targetUrl);
        if (ok) successCount++;
      }
    }

    console.log('\n==================================================');
    console.log(`Summary: Passed ${successCount} / ${totalTests} tests.`);
    if (successCount === totalTests) {
      console.log('🎉 ALL TESTS PASSED!');
    } else {
      console.error('❌ SOME TESTS FAILED!');
    }
  } catch (err) {
    console.error('Database connection or query failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
