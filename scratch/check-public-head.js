const searchKey = "videos/user_3CMgl0E1u3OcgATvBIZR3rByAXo/1780348028404-0qgrmx3x-0.bin";
const publicUrl = `https://f003.backblazeb2.com/file/saadstudio-storage/${searchKey}`;

async function main() {
  console.log(`Checking public URL: ${publicUrl}`);
  try {
    const res = await fetch(publicUrl, { method: "HEAD" });
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Headers:`, Object.fromEntries(res.headers.entries()));
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

main();
