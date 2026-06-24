import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import {
  S3Client,
  ListObjectsV2Command,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

function getOptionalEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function getRequiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value) {
    return null;
  }
  return value;
}

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const R2_BUCKET_NAME = getOptionalEnv("R2_BUCKET_NAME", "R2_BUCKET");
    let R2_ENDPOINT = getOptionalEnv("R2_ENDPOINT");
    const R2_ACCOUNT_ID = getRequiredEnv("R2_ACCOUNT_ID");
    const R2_ACCESS_KEY_ID = getRequiredEnv("R2_ACCESS_KEY_ID");
    const R2_SECRET_ACCESS_KEY = getRequiredEnv("R2_SECRET_ACCESS_KEY");
    const R2_PUBLIC_URL = getOptionalEnv(
      "R2_PUBLIC_BASE_URL",
      "R2_PUBLIC_URL",
      "NEXT_PUBLIC_R2_PUBLIC_BASE_URL",
      "NEXT_PUBLIC_R2_PUBLIC_URL"
    );

    // Construct endpoint from account ID if not explicitly provided
    if (!R2_ENDPOINT && R2_ACCOUNT_ID) {
      R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    }

    let canListBucket = false;
    let sampleObjectCount = null;

    if (R2_BUCKET_NAME && R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
      const client = new S3Client({
        region: "auto",
        endpoint: R2_ENDPOINT,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      });

      try {
        // Test bucket connectivity with HeadBucket
        await client.send(new HeadBucketCommand({ Bucket: R2_BUCKET_NAME }));

        // Try to list up to 10 objects
        const listResponse = await client.send(
          new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, MaxKeys: 10 })
        );

        canListBucket = true;
        if (listResponse.KeyCount !== undefined) {
          sampleObjectCount = listResponse.KeyCount;
        } else if (listResponse.Contents) {
          sampleObjectCount = listResponse.Contents.length;
        }
      } catch {
        canListBucket = false;
      }
    }

    return NextResponse.json({
      R2_BUCKET_NAME,
      R2_ENDPOINT,
      R2_PUBLIC_URL,
      R2_ACCOUNT_ID_SUFFIX: R2_ACCOUNT_ID ? R2_ACCOUNT_ID.slice(-6) : null,
      canListBucket,
      sampleObjectCount,
    });
  } catch (error) {
    console.error("R2 diagnostic route error:", error);
    return NextResponse.json({
      R2_BUCKET_NAME: null,
      R2_ENDPOINT: null,
      R2_PUBLIC_URL: null,
      R2_ACCOUNT_ID_SUFFIX: null,
      canListBucket: false,
      sampleObjectCount: null,
      error: "Unknown error"
    });
  }
}
