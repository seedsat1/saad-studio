export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch("https://www.runninghub.ai/task/openapi/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
