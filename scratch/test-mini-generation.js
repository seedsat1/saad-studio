const fs = require('fs');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[match[1]] = value.trim();
    }
  });
  return env;
}

const env = { ...parseEnv('.env'), ...parseEnv('.env.local') };
const API_KEY = env.BYTEPLUS_API_KEY;

if (!API_KEY) {
  console.error("Error: BYTEPLUS_API_KEY is not defined in environment files.");
  process.exit(1);
}

const BASE_URL = env.BYTEPLUS_ARK_BASE_URL || "https://ark.ap-southeast.bytepluses.com/api/v3";
const TASK_URL = `${BASE_URL.replace(/\/+$/, '')}/contents/generations/tasks`;

console.log("Using API Key:", API_KEY.slice(0, 10) + "..." + API_KEY.slice(-5));
console.log("Endpoint URL:", TASK_URL);

async function testGeneration() {
  const payload = {
    model: "seed-2-0-mini-260428",
    content: [
      {
        type: "text",
        text: "A close-up shot of a steaming cup of coffee on a wooden table, warm morning light, photorealistic."
      }
    ],
    ratio: "16:9",
    resolution: "720p",
    duration: 5,
    generate_audio: false
  };

  console.log("\n--- Submitting request ---");
  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(TASK_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log("Response Status:", response.status, response.statusText);
    const bodyText = await response.text();
    console.log("Response Body (Raw):", bodyText);

    let data;
    try {
      data = JSON.parse(bodyText);
    } catch {
      console.error("Response is not JSON.");
      return;
    }

    const taskId = data.id || data.task_id || data.taskId || data.data?.id || data.data?.task_id;
    if (!response.ok || !taskId) {
      console.error("Submission failed. Status is not OK or task ID is missing.");
      return;
    }

    console.log(`\nSubmission succeeded! Task ID: ${taskId}`);
    console.log("--- Starting Polling ---");

    const pollUrl = `${TASK_URL}/${encodeURIComponent(taskId)}`;
    
    for (let attempt = 1; attempt <= 60; attempt++) {
      console.log(`Attempt ${attempt}: Fetching task status...`);
      const pollResponse = await fetch(pollUrl, {
        headers: {
          "Authorization": `Bearer ${API_KEY}`
        }
      });

      const pollBodyText = await pollResponse.text();
      console.log(`Status: ${pollResponse.status}. Body: ${pollBodyText}`);

      if (!pollResponse.ok) {
        console.error("Polling request failed.");
        break;
      }

      let pollData;
      try {
        pollData = JSON.parse(pollBodyText);
      } catch {
        console.error("Poll response is not JSON.");
        break;
      }

      const status = (pollData.status || pollData.data?.status || "").toLowerCase();
      console.log(`Current Status: ${status}`);

      if (status === "succeeded" || status === "completed" || status === "completed_with_watermark") {
        const videoUrl = pollData.content?.video_url || pollData.data?.content?.video_url;
        console.log("\nSuccess! Video generated successfully!");
        console.log("Video URL:", videoUrl);
        break;
      }

      if (status === "failed") {
        const errMsg = pollData.error?.message || pollData.data?.error?.message || "unknown error";
        console.error(`\nGeneration failed: ${errMsg}`);
        break;
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

  } catch (error) {
    console.error("Request failed:", error);
  }
}

testGeneration();
