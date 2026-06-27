import { defaultProvider } from "../lib/storage";

async function main() {
  const url = defaultProvider.getPublicUrl("images", "test-image.jpg");
  console.log("Resolved URL:", url);
  try {
    const res = await fetch(url);
    console.log("Fetch Status:", res.status, res.statusText);
  } catch (e) {
    console.error("Fetch Error:", e);
  }
}

main();
