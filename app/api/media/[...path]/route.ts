import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

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
  "Accept-Ranges": "bytes",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const bucketName = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || "saadstudio-media";

    const pathParts = params.path || [];
    if (pathParts.length === 0) {
      return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
    }

    const key = pathParts.join("/");
    const client = getR2Client();
    const headCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const headResponse = await client.send(headCommand);
    const contentType = headResponse.ContentType || "application/octet-stream";
    const contentLength = headResponse.ContentLength || 0;
    const cacheControl = headResponse.CacheControl || "public, max-age=31536000, immutable";

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(contentLength),
        "Cache-Control": cacheControl,
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("[api/media HEAD] Failed to head R2 media:", error);
    return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const bucketName = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || "saadstudio-media";

    const pathParts = params.path || [];
    if (pathParts.length === 0) {
      return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
    }

    const key = pathParts.join("/");
    const client = getR2Client();
    const range = req.headers.get("range");

    // Step 1: Get object metadata with HeadObject first
    const headCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const headResponse = await client.send(headCommand);
    const totalSize = headResponse.ContentLength || 0;
    const contentType = headResponse.ContentType || "application/octet-stream";
    const cacheControl = headResponse.CacheControl || "public, max-age=31536000, immutable";
    const etag = headResponse.ETag || "";
    const lastModified = headResponse.LastModified?.toUTCString() || "";

    let start = 0;
    let end = totalSize - 1;
    let statusCode = 200;
    let contentRange = "";

    // Handle Range requests
    if (range) {
      const rangeMatch = range.match(/bytes=(\d+)-(\d*)/);
      if (rangeMatch) {
        start = parseInt(rangeMatch[1], 10);
        end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : totalSize - 1;
        if (end >= totalSize) {
          end = totalSize - 1;
        }
        if (start < 0 || start > end) {
          return new NextResponse("Range Not Satisfiable", {
            status: 416,
            headers: {
              "Content-Range": `bytes */${totalSize}`,
              ...corsHeaders,
            },
          });
        }
        statusCode = 206;
        contentRange = `bytes ${start}-${end}/${totalSize}`;
      }
    }

    // Step 2: Get object with range if needed
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      Range: range ? `bytes=${start}-${end}` : undefined,
    });

    const getResponse = await client.send(getCommand);
    const body = getResponse.Body;

    if (!body) {
      return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
    }

    // Prepare response headers
    const responseHeaders: Record<string, string | number | string[]> = {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      ...corsHeaders,
    };

    if (statusCode === 206) {
      responseHeaders["Content-Range"] = contentRange;
      responseHeaders["Content-Length"] = end - start + 1;
    } else {
      responseHeaders["Content-Length"] = totalSize;
    }

    if (etag) responseHeaders["ETag"] = etag;
    if (lastModified) responseHeaders["Last-Modified"] = lastModified;

    // Return streamed response
    return new NextResponse(body as ReadableStream, {
      status: statusCode,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[api/media GET] Failed to fetch R2 media:", error);
    return new NextResponse("Not Found", { status: 404, headers: corsHeaders });
  }
}
