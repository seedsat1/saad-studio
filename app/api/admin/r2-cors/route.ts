/**
 * GET /api/admin/r2-cors
 * One-time endpoint: sets CORS policy on the configured R2 bucket so browsers
 * can do presigned PUT uploads directly from saadstudio.app.
 * Admin-only. Hit it once from your browser.
 */
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";

function getEnv(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return "";
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const accountId = getEnv("R2_ACCOUNT_ID");
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  const bucket = getEnv("R2_BUCKET", "R2_BUCKET_NAME");
  const endpoint = getEnv("R2_ENDPOINT") || `https://${accountId}.r2.cloudflarestorage.com`;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return NextResponse.json(
      { error: "Missing R2 env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET" },
      { status: 500 }
    );
  }

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED" as const,
    responseChecksumValidation: "WHEN_REQUIRED" as const,
  });

  const corsRules = [
    {
      AllowedOrigins: [
        "*",
        "https://www.saadstudio.app",
        "https://saadstudio.app",
        "http://localhost:3000",
      ],
      AllowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag", "Content-Length"],
      MaxAgeSeconds: 3600,
    },
  ];

  try {
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: { CORSRules: corsRules },
      })
    );

    const { CORSRules } = await client.send(
      new GetBucketCorsCommand({ Bucket: bucket })
    );

    return NextResponse.json({
      ok: true,
      message: `CORS policy applied to bucket: ${bucket}`,
      rules: CORSRules,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to set CORS";
    const accessDenied = /access\s*denied/i.test(message);
    return NextResponse.json(
      {
        error: message,
        hint: accessDenied
          ? "R2 API key does not have bucket CORS permission (s3:PutBucketCORS). Set CORS in Cloudflare Dashboard or use a key with bucket admin scope."
          : undefined,
      },
      { status: 500 }
    );
  }
}
