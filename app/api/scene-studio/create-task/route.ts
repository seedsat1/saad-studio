export async function POST(req: Request) {
  try {
    const serverApiKey = process.env.RUNNINGHUB_API_KEY;
    if (!serverApiKey) return Response.json({ code: -1, msg: "RUNNINGHUB_API_KEY not configured" }, { status: 500 });

    const body = await req.json();
    // override apiKey with server-side key
    const payload = { ...body, apiKey: serverApiKey };

    const res = await fetch("https://www.runninghub.ai/task/openapi/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { code: -1, msg: err instanceof Error ? err.message : "Create-task proxy error" },
      { status: 500 }
    );
  }
}
