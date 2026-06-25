const fetch = require('node-fetch');
const fs = require('fs');

async function main() {
  const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrYW52YWhxa2dnbWh6bGtuZHVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEzNjk4MywiZXhwIjoyMDg5NzEyOTgzfQ.PqgsQi1qQ_Z13VoK7M7e0-tf023Ikfp3D8hQ-qYTM7E";
  const fileUrl = "https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/public/videos/admin-cms/1779215073996-5n4540.webm";
  
  // Try public download first (which returned 402)
  console.log("1. Trying public download...");
  try {
    const res = await fetch(fileUrl);
    console.log("Public download status:", res.status);
    const body = await res.text();
    console.log("Public download response:", body.substring(0, 200));
  } catch (e) {
    console.error("Public failed:", e);
  }

  // Try downloading with Service Role Key
  console.log("\n2. Trying download with Service Role Key...");
  try {
    const res = await fetch("https://lkanvahqkggmhzlknduc.supabase.co/storage/v1/object/authenticated/videos/admin-cms/1779215073996-5n4540.webm", {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });
    console.log("Authenticated download status:", res.status);
    const body = await res.text();
    console.log("Authenticated download response:", body.substring(0, 200));
  } catch (e) {
    console.error("Authenticated failed:", e);
  }
}

main();
