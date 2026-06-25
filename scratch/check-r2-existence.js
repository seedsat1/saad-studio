const searchKey = "videos/user_3EGsHzh6eCMhZ4OMcgagSaF0Di7/cmqtqgfxg000211wi71g515ta.mp4";
const r2Url = `https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev/${searchKey}`;

async function main() {
  console.log(`Checking R2 URL: ${r2Url}`);
  try {
    const res = await fetch(r2Url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Headers:`, Object.fromEntries(res.headers.entries()));
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

main();
