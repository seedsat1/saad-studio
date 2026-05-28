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
  PutObjectCommand,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DIRECT_UPLOAD_ORIGINS = [
  "https://www.saadstudio.app",
  "https://saadstudio.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
const DIRECT_UPLOAD_METHODS = ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"];
const DIRECT_UPLOAD_HEADERS = ["*"];
const DIRECT_UPLOAD_EXPOSE_HEADERS = ["ETag", "Content-Length"];

function getEnv(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return "";
}

async function verifyCorsWithSignedUrl(params: {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}) {
  const client = new S3Client({
    region: "auto",
    endpoint: params.endpoint,
    credentials: { accessKeyId: params.accessKeyId, secretAccessKey: params.secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED" as const,
    responseChecksumValidation: "WHEN_REQUIRED" as const,
  });
  const command = new PutObjectCommand({
    Bucket: params.bucket,
    Key: `cors-check/${Date.now()}.txt`,
    ContentType: "text/plain",
  });
  const signedUrl = await getSignedUrl(client, command, { expiresIn: 60 });
  const res = await fetch(signedUrl, {
    method: "OPTIONS",
    headers: {
      Origin: "https://www.saadstudio.app",
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type",
    },
    cache: "no-store",
  });

  return {
    ok: res.ok,
    status: res.status,
    accessControlAllowOrigin: res.headers.get("access-control-allow-origin"),
    accessControlAllowMethods: res.headers.get("access-control-allow-methods"),
    accessControlAllowHeaders: res.headers.get("access-control-allow-headers"),
  };
}

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const accountId = getEnv("R2_ACCOUNT_ID");
  const cloudflareApiToken = getEnv("CLOUDFLARE_API_TOKEN", "CF_API_TOKEN");
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  const bucket = getEnv("R2_BUCKET", "R2_BUCKET_NAME");
  const endpoint = getEnv("R2_ENDPOINT") || `https://${accountId}.r2.cloudflarestorage.com`;
  const checkOnly = new URL(req.url).searchParams.get("check") === "1";

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return NextResponse.json(
      { error: "Missing R2 env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET" },
      { status: 500 }
    );
  }

  const corsRules = [
    {
      AllowedOrigins: DIRECT_UPLOAD_ORIGINS,
      AllowedMethods: DIRECT_UPLOAD_METHODS,
      AllowedHeaders: DIRECT_UPLOAD_HEADERS,
      ExposeHeaders: DIRECT_UPLOAD_EXPOSE_HEADERS,
      MaxAgeSeconds: 3600,
    },
  ];

  try {
    if (checkOnly) {
      const result = await verifyCorsWithSignedUrl({ endpoint, accessKeyId, secretAccessKey, bucket });
      return NextResponse.json({
        ok: Boolean(result.ok && result.accessControlAllowOrigin),
        bucket,
        result,
      });
    }

    if (cloudflareApiToken) {
      const apiRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucket)}/cors`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${cloudflareApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rules: [
              {
                allowed: {
                  origins: DIRECT_UPLOAD_ORIGINS,
                  methods: DIRECT_UPLOAD_METHODS,
                  headers: DIRECT_UPLOAD_HEADERS,
                },
                exposeHeaders: DIRECT_UPLOAD_EXPOSE_HEADERS,
                maxAgeSeconds: 3600,
              },
            ],
          }),
        },
      );
      const apiBody = await apiRes.text().catch(() => "");
      if (!apiRes.ok) {
        throw new Error(`Cloudflare R2 CORS API failed (${apiRes.status}): ${apiBody.slice(0, 300)}`);
      }

      return NextResponse.json({
        ok: true,
        message: `CORS policy applied to bucket via Cloudflare API: ${bucket}`,
        response: apiBody,
      });
    }

    const client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED" as const,
      responseChecksumValidation: "WHEN_REQUIRED" as const,
    });

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
