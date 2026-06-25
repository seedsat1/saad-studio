const fs = require("fs");
const path = require("path");

function loadMigrationEnv() {
  const envPath = path.resolve(process.cwd(), ".env.migration");
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env.migration not found at ${envPath}`);
  }
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const parts = trimmed.split("=");
    const key = parts[0]?.trim();
    let val = parts.slice(1).join("=").trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    if (key) env[key] = val;
  });
  return env;
}

async function main() {
  try {
    const env = loadMigrationEnv();
    const keyId = env.B2_ACCESS_KEY_ID;
    const applicationKey = env.B2_SECRET_ACCESS_KEY;
    const bucketName = env.B2_BUCKET_NAME || "saadstudio-storage";

    // 1. Authorize
    console.log("1. Authorizing...");
    const authHeader = "Basic " + Buffer.from(`${keyId}:${applicationKey}`).toString("base64");
    const authRes = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
      headers: { Authorization: authHeader }
    });
    
    if (!authRes.ok) {
      console.error("Auth failed:", authRes.status, await authRes.text());
      return;
    }
    
    const authData = await authRes.json();
    const { authorizationToken, apiUrl, downloadUrl, allowed } = authData;
    const bucketId = allowed.bucketId;
    console.log("✅ Authorized successfully!");
    console.log("API URL:", apiUrl);
    console.log("Download URL:", downloadUrl);
    console.log("Bucket ID:", bucketId);

    // 2. Get Upload URL
    console.log("\n2. Getting upload URL...");
    const getUploadUrlRes = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: "POST",
      headers: {
        Authorization: authorizationToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ bucketId })
    });

    if (!getUploadUrlRes.ok) {
      console.error("❌ Failed to get upload URL:", getUploadUrlRes.status, await getUploadUrlRes.text());
      return;
    }

    const uploadUrlData = await getUploadUrlRes.json();
    const uploadUrl = uploadUrlData.uploadUrl;
    const uploadAuthToken = uploadUrlData.authorizationToken;
    console.log("✅ Got upload URL!");

    // 3. Upload File
    console.log("\n3. Uploading file via native API...");
    const fileName = "videos/native-test-file.txt";
    const fileContent = "Hello from native B2 diagnostic upload!";
    const sha1 = require("crypto").createHash("sha1").update(fileContent).digest("hex");
    
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: uploadAuthToken,
        "X-Bz-File-Name": encodeURIComponent(fileName),
        "Content-Type": "text/plain",
        "Content-Length": String(Buffer.byteLength(fileContent)),
        "X-Bz-Content-Sha1": sha1
      },
      body: fileContent
    });

    if (!uploadRes.ok) {
      console.error("❌ Upload failed:", uploadRes.status, await uploadRes.text());
      return;
    }

    const uploadData = await uploadRes.json();
    const fileId = uploadData.fileId;
    console.log("✅ Upload successful! File ID:", fileId);

    // 4. Download File by Name
    console.log("\n4. Downloading file by name via native API...");
    const downloadByNameUrl = `${downloadUrl}/file/${bucketName}/${fileName}`;
    const downloadRes = await fetch(downloadByNameUrl, {
      headers: { Authorization: authorizationToken }
    });

    console.log("Download by Name Status:", downloadRes.status);
    console.log("Download by Name Headers:");
    for (const [key, value] of downloadRes.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    const downloadBody = await downloadRes.text();
    console.log("Download by Name Body:", downloadBody);

    // 5. Download File by ID
    console.log("\n5. Downloading file by ID via native API...");
    const downloadByIdUrl = `${downloadUrl}/b2api/v2/b2_download_file_by_id?fileId=${fileId}`;
    const downloadByIdRes = await fetch(downloadByIdUrl, {
      headers: { Authorization: authorizationToken }
    });

    console.log("Download by ID Status:", downloadByIdRes.status);
    console.log("Download by ID Headers:");
    for (const [key, value] of downloadByIdRes.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    const downloadByIdBody = await downloadByIdRes.text();
    console.log("Download by ID Body:", downloadByIdBody);

    // 6. Delete File
    console.log("\n6. Cleaning up (deleting file)...");
    const deleteRes = await fetch(`${apiUrl}/b2api/v2/b2_delete_file_version`, {
      method: "POST",
      headers: {
        Authorization: authorizationToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fileName, fileId })
    });
    
    if (deleteRes.ok) {
      console.log("✅ Cleanup successful!");
    } else {
      console.error("❌ Cleanup failed:", deleteRes.status, await deleteRes.text());
    }

  } catch (err) {
    console.error("❌ Diagnostic test failed:", err);
  }
}

main();
