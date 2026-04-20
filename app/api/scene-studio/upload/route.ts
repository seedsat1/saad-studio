export async function POST(req: Request) {
  try {
    const serverApiKey = process.env.RUNNINGHUB_API_KEY;
    if (!serverApiKey) return Response.json({ code: -1, msg: "Service not configured" }, { status: 500 });

    const incomingForm = await req.formData();
    const outForm = new FormData();
    // copy all fields except apiKey from client
    for (const [key, value] of incomingForm.entries()) {
      if (key !== "apiKey") outForm.append(key, value);
    }
    outForm.append("apiKey", serverApiKey);

    const res = await fetch("https://www.runninghub.ai/task/openapi/upload", {
      method: "POST",
      body: outForm,
    });
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { code: -1, msg: err instanceof Error ? "Upload failed. Please try again." : "Upload failed" },
      { status: 500 }
    );
  }
}
