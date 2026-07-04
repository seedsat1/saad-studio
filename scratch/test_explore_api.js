const fetch = require("node-fetch");

async function test() {
  const prompt = "تبديل وجه في الصورة";
  console.log("Testing explore API route with prompt:", prompt);
  try {
    const res = await fetch("http://localhost:3000/api/explore", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": "" // Clerk session would be needed if auth is enforced
      },
      body: JSON.stringify({ prompt }),
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Response:", JSON.stringify(json, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
