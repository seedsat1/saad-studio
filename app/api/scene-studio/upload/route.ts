import { auth } from "@clerk/nextjs/server";
import { checkStoryboardReferenceImageSafety, UnsafeReferenceImageError } from "@/lib/storyboard-reference-safety";

async function fileToDataUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ code: -1, msg: "Unauthorized" }, { status: 401 });
    }

    const serverApiKey = process.env.RUNNINGHUB_API_KEY;
    if (!serverApiKey) return Response.json({ code: -1, msg: "Service not configured" }, { status: 500 });

    const incomingForm = await req.formData();
    const values = Array.from(incomingForm.values());
    for (const value of values) {
      if (value instanceof File) {
        const dataUrl = await fileToDataUrl(value);
        if (dataUrl) await checkStoryboardReferenceImageSafety(dataUrl);
      }
    }

    const outForm = new FormData();
    const entries = Array.from(incomingForm.entries());
    for (const [key, value] of entries) {
      if (key !== "apiKey") outForm.append(key, value);
    }

    const res = await fetch("https://www.runninghub.ai/openapi/v2/media/upload/binary", {
      method: "POST",
      headers: { Authorization: `Bearer ${serverApiKey}` },
      body: outForm,
    });
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    if (err instanceof UnsafeReferenceImageError) {
      return Response.json({ code: -1, msg: err.message }, { status: 400 });
    }

    return Response.json(
      { code: -1, msg: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
