import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ code: -1, msg: "Unauthorized" }, { status: 401 });
    }

    const serverApiKey = process.env.RUNNINGHUB_API_KEY;
    if (!serverApiKey) return Response.json({ code: -1, msg: "Service not configured" }, { status: 500 });

    const incomingForm = await req.formData();
    const outForm = new FormData();
    for (const [key, value] of incomingForm.entries()) {
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
    return Response.json(
      { code: -1, msg: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
