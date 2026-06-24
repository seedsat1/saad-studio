import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (r2Client) return r2Client;

  const accountId = process.env.R2_ACCOUNT_ID || "";
  r2Client = new S3Client({
    region: process.env.R2_REGION || "auto",
    endpoint: process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return r2Client;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const bucketName = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || "saadstudio-media";
    
    // Reconstruct the key from path parameters
    const pathParts = params.path || [];
    if (pathParts.length === 0) {
      return NextResponse.json("Not Found", { status: 404, headers: corsHeaders });
    }
    
    const key = pathParts.join("/");
    
    const client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    const response = await client.send(command);
    if (!response.Body) {
      return NextResponse.json("Not Found", { status: 404, headers: corsHeaders });
    }
    
    const contentType = response.ContentType || "application/octet-stream";
    const cacheControl = response.CacheControl || "public, max-age=31536000, immutable";
    
    const bytes = await response.Body.transformToByteArray();
    
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
        "Content-Length": String(bytes.length),
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("[api/media] Failed to fetch R2 media", error);
    return NextResponse.json("Not Found", { status: 404, headers: corsHeaders });
  }
}
