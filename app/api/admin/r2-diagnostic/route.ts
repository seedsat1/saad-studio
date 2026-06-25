import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { defaultProvider } from "@/lib/storage";

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const bucketName = process.env.B2_BUCKET || process.env.B2_BUCKET_NAME || process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || "saadstudio-storage";
    const endpoint = process.env.B2_ENDPOINT || process.env.R2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com";
    const publicUrl = process.env.B2_PUBLIC_URL || process.env.B2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_BASE_URL || "";

    let canConnect = false;
    let errorDetail = null;

    try {
      // Test B2 connectivity by checking if a dummy key exists.
      // If credentials are valid, this returns false (does not throw).
      // If credentials or config are invalid, it throws.
      await defaultProvider.exists({ bucket: "", path: "diagnostics-probe-temp" });
      canConnect = true;
    } catch (err: any) {
      canConnect = false;
      errorDetail = err.message || String(err);
    }

    return NextResponse.json({
      provider: "Backblaze B2",
      bucketName,
      endpoint,
      publicUrl,
      canConnect,
      errorDetail,
    });
  } catch (error: any) {
    console.error("Storage diagnostic route error:", error);
    return NextResponse.json({
      provider: "Backblaze B2",
      bucketName: null,
      endpoint: null,
      publicUrl: null,
      canConnect: false,
      error: error.message || "Unknown error",
    });
  }
}
