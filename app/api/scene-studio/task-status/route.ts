export async function POST(req: Request) {
  try {
    const serverApiKey = process.env.RUNNINGHUB_API_KEY;
    if (!serverApiKey) return Response.json({ code: -1, msg: "Service not configured" }, { status: 500 });

    const { taskId } = await req.json();
    const res = await fetch("https://www.runninghub.ai/openapi/v2/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serverApiKey}`,
      },
      body: JSON.stringify({ taskId }),
    });
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { code: -1, msg: "Status check failed. Please try again." },
      { status: 500 }
    );
  }
}
