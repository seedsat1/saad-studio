import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "application/pdf"]);

function getExtension(fileName: string, mimeType: string) {
  const extFromName = path.extname(fileName || "").toLowerCase();
  if (extFromName) return extFromName;
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "application/pdf") return ".pdf";
  return ".bin";
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const form = await req.formData();
    const file = form.get("file");
    const orderId = String(form.get("orderId") ?? "").trim();

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Only PNG, JPG, and PDF are allowed" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, "");
    const fileExt = getExtension(file.name, file.type);
    const fileName = `${safeOrderId}-${Date.now()}-${randomUUID().slice(0, 8)}${fileExt}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "payment-proofs");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), bytes);

    const proofUrl = `/uploads/payment-proofs/${fileName}`;
    return NextResponse.json({
      proofUrl,
      proofFileName: file.name,
      mimeType: file.type,
      size: file.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload proof";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

